import json
import requests
import pandas

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


def main():
    # fetch data from etternaonline.com and create a csv from it
    print("fetching data from etternaonline")
    response = requests.get(
        "https://etternaonline.com/leaderboard/leaderboard")

    data = json.loads(response.text)
    df = pandas.DataFrame.from_records(data["data"])
    df.rename(columns=SKILLS, inplace=True)
    df["flag_img"] = df["username"].str.extract('flags\/(.*?)"')
    df["country"] = df["username"].str.extract('title="(.*?)"')
    df["username"] = df["username"].str.extract('user\/(.*?)"')
    # TODO for each user, fetch user id if doesn't exist and use that to fetch last score submission date from score/userScores

    df.to_csv("./resources/csv/EtternaUserData.csv", index=False)
    print("finished")


main()
