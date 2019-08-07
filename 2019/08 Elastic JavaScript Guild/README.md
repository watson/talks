# Elastic JavaScript Guild

- **Title:** Post-Mortem Debugging in Node.js
- **Date:** 2019-08-07
- **Location:** Online

## Abstract

Part of post-mortem debugging involves taking a memory dump when an
issue occurs in your application and later analyze it offline. This is
hard enough as it is but only becomes harder in Node.js as the existing
tools used to analyze core dumps, doesn’t know how to analyze the memory
of JIT-compiled JavaScript programs.

The talk will primarily focus on llnode and how you can use this tool to
better understand why a Node.js process is behaving odd or is crashing.

[Slides on Speaker Deck](https://speakerdeck.com/wa7son/elastic-javascript-guild-august-2019-post-mortem-debugging-in-node-dot-js)
