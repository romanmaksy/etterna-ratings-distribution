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
    # fetch data from etternaonline.com, format it and create a csv for each skill/rating
    print("fetching data from etternaonline")
    response = requests.get("https://etternaonline.com/leaderboard/leaderboard")
    data = json.loads(response.text)
    df = pandas.DataFrame.from_records(data["data"])
    df.rename(columns=SKILLS, inplace=True)
    df.drop("rank", axis=1, inplace=True)
    df["username"] = df["username"].str.extract('user\/(.*)"')

    print("creating csvs")
    for originalColName, skill in SKILLS.items():
        exportCSVForSkill(df, skill)

    print("finished")

# function that will format, generate percentile rankings and export a csv for the passed in skill
def exportCSVForSkill(df, skill):
    print("creating csv for", skill)
    skillDataFrame = df[["username", skill]].copy()
    skillDataFrame.rename(columns={skill: "score"}, inplace=True)
    skillDataFrame = skillDataFrame.sort_values(
        by=["score", "username"], ascending=True
    )
    skillDataFrame["percentile"] = df[skill].rank(pct=True) * 100
    skillDataFrame.to_csv("resources/{0}Rankings.csv".format(skill), index=False)

main()
