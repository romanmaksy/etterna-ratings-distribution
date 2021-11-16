[![update-leaderboard-data](https://github.com/romanmaksy/etterna-ratings-distribution/actions/workflows/updateLeaderboardData.yaml/badge.svg)](https://github.com/romanmaksy/etterna-ratings-distribution/actions/workflows/updateLeaderboardData.yaml)
# etterna-ratings-distribution

A simple github pages app I made in my spare time to view and filter the skill rating distribution data of Etterna players. There are some basic filters you can use to navigate the data, and you can also put in a players name to have them highlighted on the chart. The csv data is updated daily with a Python script that runs via GitHub Actions - enjoy!

I haven't spent much time on this so are still improvements would like to make, in particular would like to store the csv outside of the repo in an s3 bucket or similar. This and similar features/fixes are tracked in the issues tab, but can't guarantee when I'll get around to doing them.

See it in action here: https://romanmaksy.github.io/etterna-ratings-distribution/
