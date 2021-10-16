import concurrent.futures
import json
import os
import re
import time
from threading import Lock

import numpy
import pandas
import requests
from numpy import dtype
from requests.structures import CaseInsensitiveDict

pandas.options.mode.chained_assignment = None  # default='warn'

# define mapping from old column name to new
SKILLS = {
    "player_rating": "Overall",
    "Stream": "Stream",
    "Jumpstream": "Jumpstream",
    "Handstream": "Handstream",
    "Stamina": "Stamina",
    "JackSpeed": "Jacks",
    "Chordjack": "Chordjacks",
    "Technical": "Technical",
}

# constants and globals
MAX_THREADS = min(32, os.cpu_count() + 4)
MAX_REQUESTS_PER_SECOND = 1.5
SECONDS_BETWEEN_REQUESTS = 1 / MAX_REQUESTS_PER_SECOND
NAN_INT = -9999

last_request_time = 0
rate_limit_lock = Lock()
s_print_lock = Lock()


def main():
    startTime = time.time()

    print("loading previous data")
    prev_df = pandas.read_csv("./resources/csv/EtternaUserData.csv")

    print("fetching leaderboard data")
    response = requests.get("https://etternaonline.com/leaderboard/leaderboard")
    data = json.loads(response.text)

    print("formatting/parsing leaderboard data")
    new_df = pandas.DataFrame.from_records(data["data"])
    new_df.rename(columns=SKILLS, inplace=True)
    new_df["flag_img"] = new_df["username"].str.extract('flags\/(.*?)"')
    new_df["country"] = new_df["username"].str.extract('title="(.*?)"')
    new_df["username"] = new_df["username"].str.extract('user\/(.*?)"')

    # add existing previously fetched userids to new leaderboard data (no need to fetch them twice)
    merged_df = new_df.merge(
        prev_df[["username", "userid", "lastActive"]], how="left", on="username"
    )

    # since default NaN after merge is float, need to fill with int to convert column into right format
    merged_df["userid"] = merged_df["userid"].fillna(NAN_INT, downcast="infer")

    # split data into seperate buckets so we can process each chunk in parallel
    print(f"splitting rows into {MAX_THREADS} buckets, one for each thread to process")
    split_dfs = numpy.array_split(merged_df, MAX_THREADS)

    # process each bucket on a different thread, then reassemble results once they are all done
    # processing basically means get user id if don't have it, then use that to fetch date of last score submission
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = [executor.submit(update_dataframe, df) for df in split_dfs]
        concurrent.futures.wait(futures)
        reunited_df = pandas.concat([future.result() for future in futures])

    # save to csv
    reunited_df.to_csv("./resources/csv/EtternaUserData.csv", index=False)

    elapsedTime = time.time() - startTime
    print(
        f"Processed {len(merged_df.index)} users in {elapsedTime} seconds which is an average of {elapsedTime / len(merged_df.index)} seconds per user."
    )
    print(
        f"MAX_THREADS was set to {MAX_THREADS}, and API requests were limited to {MAX_REQUESTS_PER_SECOND} per second."
    )


def update_dataframe(df):
    return df.apply(update_row, axis=1)


def update_row(row):
    s_print(f"processing row for {row['username']}")

    if row["userid"] == NAN_INT:
        row["userid"] = fetch_missing_user_id(row["username"])

    row["lastActive"] = fetch_last_active_date(row["userid"], row["lastActive"])
    s_print(row.to_frame().T)

    return row


def fetch_missing_user_id(username):
    rate_limit()
    s_print(f"getting user id for {username}")
    try:
        response = requests.get(f"https://etternaonline.com/user/{username}")
        response.raise_for_status()
        return re.search("userid':\s*'(\d+)'", response.text).group(1)
    except Exception as e:
        s_print(f"error getting user id for {username}. error: {e}")
        return NAN_INT


def fetch_last_active_date(userid, lastActive):
    rate_limit()
    print(f"getting last active date for userid {userid}")

    url = "https://etternaonline.com/score/userScores"
    headers = CaseInsensitiveDict()
    headers["Content-Type"] = "application/x-www-form-urlencoded"
    data = f"order%5B0%5D%5Bcolumn%5D=5&order%5B0%5D%5Bdir%5D=desc&length=1&userid={userid}"

    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        responseJson = json.loads(response.text)
        return responseJson["data"][0]["datetime"]
    except Exception as e:
        s_print(
            f"error getting last score submission date for userid {userid}. error: {e}"
        )
        return "1970-01-01" if pandas.isna(lastActive) else lastActive


def rate_limit():
    """Thread safe rate limiting function"""
    with rate_limit_lock:
        global last_request_time
        seconds_since_last = time.time() - last_request_time
        if seconds_since_last < SECONDS_BETWEEN_REQUESTS:
            time.sleep(SECONDS_BETWEEN_REQUESTS - seconds_since_last)
        last_request_time = time.time()


def s_print(*a, **b):
    """Thread safe print function"""
    with s_print_lock:
        print(*a, **b)


main()
