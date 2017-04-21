# Musician Graph

This project is an attempt visualize the network of professional musicians. This project leverages neo4j as a database and uses d3 force layout to display the data.

View the running visualization at http://johnbfox.com/musician-graph/

## Instructions

Before running the project, you must run the screen scraper that collects the data driving the visualization.  Grab that code [here](https://github.com/johnbfox/ArtistGraphCrawler).

To run this project, clone the repository, and run

```
npm install
node app.js
```

Navigate to localhost:3000 in your browser to run the application.

## Links

The visualization is the second piece of a two part project.  The first piece of project is a web spider/screen scraper that parses wikipedia to recreate the network of musicians.  Find that scraper [here](https://github.com/johnbfox/ArtistGraphCrawler).

I wrote a short blog post describing the motivation for this project.
https://medium.com/@johnbfoxy/the-musician-network-366d9c5066be

## Suggestions?

If you have any suggestions to enhance this, I would be enthusiatic to hear them.  Thanks!
