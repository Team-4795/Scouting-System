# Overview
Team 4795's online scouting system, written in Node.js with Express. Supports all game types and is easily customizable with little programming knowledge. Spreadsheet exports available for advanced data analysis.

# Quick Start
[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/Team-4795/Scouting-System) or follow the steps below:
1. Ensure that [Node.js](https://nodejs.org "Node.js") and [NPM](https://www.npmjs.com/ "NPM") are installed
2. Download the repository and install the modules with `npm install`
3. Open `config.json` and enter your preferred settings
4. Load the database by running `node scripts/getData.js`
5. Start the server with `sudo npm start`

# How it Works
The scouting system provides an online interface for recording match data and analyzing teams throughout FRC events. Before qualifications start, the match schedule it fetched from [The Blue Alliance API](https://thebluealliance.com "The Blue Alliance") and saved to a database. This database is then used to generate pages for each match which can be used by scouts to record information about each team's performance. All of the data is then consolidated by the system into pages for each team, as well as a page to compare all of the teams. The site functions offline and syncs with the server once the user reconnects, allowing it to be used at competitions without WiFi or cellular data. Background syncing requires modern web technologies, so we recommend using the latest version of Chrome to prevent unexpected results or incompatibilites.

# Configuration
The system can be configured to suit your team's needs with the `config.json` file. It has five settings that must be provided and one optional setting. Each setting is defined as a property of the object inside of the configuration file. A [Blue Alliance API Key](https://www.thebluealliance.com/apidocs/v3 "The Blue Alliance") must be set under `tbaKey`, as well as your team number as `teamNumber` and the Blue Alliance ID of the event as `eventId`. If the option `password` is set, users will be required to enter it to access the system. The data points to be collected during matches are specified by the `defaultStats` property. This property must be set as an object and each property in it will be a stat to be recorded during the match. The default value and type of each stat will be whatever is provided under `defaultStats`. Currently supported data types are strings, booleans, and numbers. The way consolidated match data will be displayed on the stats page and individual team pages is determined under by the `statTypes` property. Like `defaultStats`, every stat has its own property set to the desired type. The current stat types are matchOnly, total, average, and multiple. Stats set as matchOnly do not appear on the stats page or the team pages, and multiple shows the total of each each value collected, for example, three level two climbs and one level three climb. If the stat `disabled` is set as a boolean, the system will exclude matches where it is true from stat averages. There is an example configuration in the config file that you can try, excluding an API key.

# Data Structure
All of the data gathered about the event is stored in `data/database.json`. It is an object with two properties, `teams` and `matches`. They are both arrays, with `teams` containing an object for every team and `matches` with an object for each match.

# Site Pages

>## Authentication Page
> A simple login page which is shown to users the first time they visit the site, and requires them to provide a password to access the system. Once authenticated, they will not be shown the page again for ten days.

>## Matches List
> This pages functions as the main part of the site, containing links to all of the matches and the statistics page. The matches your team is playing in are highlighted in green. Users arrive on this page the first time they authenticate.

>## Match Pages
> Each match has its own page which scouts can use to record data for that match. The page automatically saves and syncs with the server. When connected to the internet, the page updates live and users can view changes as they happen. There are three input types, a checkbox for boolean stats, plus and minus buttons for numbers, and textboxes for strings.

>## Team Pages
> All teams in the event have a dedicated page with a compiled list of their match data as well as overall stats about the team.

>## Statistics Table
> Data about all of the teams is used to compute statistics which are displayed on this page. The teams can be sorted based on this data to select alliance partners. Stats are calculated every ten seconds, therefore changes can take a moment to appear. The table can be downloaded as a CSV file.

# Competition Guide

>## Before the Event
> Before the competition, the server must be configured and running so that the scouts can access it. This is important because each scout must visit the site and authenticate while they still have an internet connection, so that it can be cached and used inside the event. There are many ways to host the server, we recommend using either [Glitch](https://glitch.com/pricing "Glitch") (paid membership), [Amazon Web Services](https://aws.amazon.com/getting-started/hands-on/deploy-nodejs-web-app/ "Amazon Web Services"), or [Linode](https://www.linode.com/products/standard-linodes/ "Linode"), however there are many other hosting providers that will work as well. Glitch is useful for testing, but the free version is not recommended for use at competitions because it has rate limits and turns off when it becomes inactive.

>## Upon Arrival / During Matches
> Once the match schedule is released, it must be entered into the system using `node scripts/getData.js`. After that is done, the scouts can start collecting data.

>## After Qualifications
> All scouts must connect to the internet so that the data they collected can be synced to the server, either at the hotel or through a WiFi hotspot away from the competition area. Now the aggregated data can viewed on the site and be used for alliance selection.

# About
This is an ongoing project with the goal of making it easier for both new and experienced teams to scout events without having to spend a ton of time creating a custom system for any specific game. If your team has any trouble getting the site running, please create an issue and we will try to assist you. This project was started because [Jake](https://github.com/JakeBoggs "JakeBoggs") got tired of frantically searching for team's datasheets before each match and decided to create a better way to do it.

# To do
- [ ] UI for fetch data and configuration
- [ ] Manual match entry
- [ ] Team and stats offline functionality
- [ ] Stats page auto update
- [ ] Modernize syntax
- [ ] Screenshots in documentation
- [ ] Fix additional data table

- [ ] Hover effect for team numbers in matches page
- [ ] Refresh offline page
- [ ] Make stats line break work
- [ ] Navbar
- [ ] Custom stat names
- [ ] Add CSV downloads to team pages
- [ ] Make database attributes consistent
- [ ] TBA request wrapper
- [ ] Rate limit (Have to be very careful, only unauthenticated)
- [ ] Add additional teams data if provided
- [ ] Rename config settings
- [ ] Mass syncing
- [ ] Match stats hover
- [ ] Fix in place stats header
- [ ] Generate heatmap
- [ ] Expand additional data images on hover
- [ ] Expand team to whole screen
- [ ] Stat compute function
- [ ] Defended stat
- [ ] Add additional data to stats page
- [ ] Wrap additional data on page shrink
- [ ] Get video links
- [ ] Add additional data for each match
- [ ] Detect red and yellow cards
- [ ] Manifest file
- [ ] Dark and light modes
- [ ] Fallback when service workers are unavailable
- [ ] Allow additional data to be edited
- [ ] Find a better solution than disabled stat for averages
- [ ] Make documentation language consistent with TBA (keys instead of IDs)
- [ ] Turn getAbilities into a library
- [ ] Websocket reconnect
- [ ] Increase saving efficiency
- [ ] Code formatting
- [ ] PWA