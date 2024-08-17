import captureWebsite from 'capture-website'
import cleaner from 'clean-html'
import fs from 'fs'

export const cleanHtml = (content) => new Promise(resolve => cleaner.clean(content, { wrap: 0 }, resolve))

const htmlHeading = () =>
  `<div id='title-background'></div>
    <div class='title-container'>
    <div class='title' id='title'>
      <div class='title-group'>
        <div class='title-text'>
          <a href="/">
            <img id='logo' alt='SurvivalScores.org logo'
                 src='./images/survivalscores_logo.svg'>
            SurvivalScores.org
          </a>
        </div>
        <div class='tagline-text'>Monitoring treaties critical to the survival of humanity</div>
      </div>
    <div id='updated'></div>
    <div class='links'>
      <a href="./about">About</a> &#x2022;
      <a href="/timeline.html">Timeline</a> &#x2022;
      <a href="https://twitter.com/survivalscores">Twitter</a> &#x2022;
      <a rel="me" href="https://mastodon.social/@survivalscores">Mastodon</a>
    </div>
  </div>

  </div>
`

export const htmlFooter = (dataDate) => `
  <div class="footer">
    <h3><b>Sources</b></h3>
    <p>Data presented in this table were retrieved from live databases maintained by the United Nations:</p>
    <ul>
      <li><a href="https://treaties.unoda.org/">Disarmament Treaties Database</a>, United Nations Office for Disarmament Affairs</li>
      <li><a href="https://treaties.un.org/Pages/ParticipationStatus.aspx">Multilateral Treaties Deposited with the Secretary-General</a>, United Nations, New York</li>
      <li><a href="https://data.un.org/">UNdata</a>, United Nations Statistics Division</li>
    </ul>
    <p>Data retrieved at ${(new Date(dataDate)).toISOString()}</p>
    <p>Source code for this project is <a href="https://github.com/arthuredelstein/survivalscores.org">available on GitHub</a>.</p>
    <br>
  </div>
`

export const page = ({ css, js, content }) => `
<!DOCTYPE html>
<html>
 <head>
  <title>SurvivalScores.org: Monitoring treaties critical to the survival of humanity</title>
  <meta charset="utf8"/>
  <meta name="format-detection" content="telephone=no" />
  <meta name="viewport" content="width=device-width, initial-scale=0.7" />
  <meta name="twitter:card" content="summary_large_image"/>
  <meta property="og:image" content="https://survivalscores.org/index-preview.png"/>
  <meta property="og:title" content="Can humanity survive?"/>
  <meta property="og:description" content="Monitoring treaties critical to human survival."/>
  <meta property="og:type" content="website"/>
  <link rel="icon" type="image/x-icon" href="./images/survivalscores_logo_dark.svg">
  <link rel="preload" href="./images/sortArrowsDown.svg" as="image">
  <link rel="preload" href="./images/sortArrowsUp.svg" as="image">
  <link rel="preload" href="./images/sortArrowsUnsorted.svg" as="image">
  <style>${css}</style>
  <script type="module">${js}</script>
 </head>
 <body>
  ${htmlHeading()}
  ${content}
 </body>
</html>
`

export const render = async (filename, html, dataDate, js, css) => {
  //  console.log(aggregated);
  const htmlPage = await cleanHtml(page({ css, js, content: html }))
  const path = `./build/${filename}`
  fs.writeFileSync(path, htmlPage)
  console.log(`wrote ${path}`)
}

export const createPreviewImage = async (htmlFile, pngFile) => {
  await captureWebsite.file(htmlFile, pngFile, {
    width: 1000,
    height: 523,
    scaleFactor: 1.0,
    overwrite: true
  })
  console.log('wrote', pngFile)
}

const convertCharacter = (char) => {
  const index = char.charCodeAt(0) - 64
  const newIndex = index + 127461
  return `&#${newIndex};`
}

export const flagEmojiHtml = (countryCode) => {
  if (countryCode === 'TP') {
    countryCode = 'TL'
  }
  return countryCode.split('').map(convertCharacter).join('')
}
