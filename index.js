import { collectAllData } from './collect.js';
import { renderSite } from './render.js';

const main = async () => {
  const dataDate = new Date();
  const { aggregatedData, populationData } = await collectAllData();
  renderSite({ aggregatedData, populationData, dataDate });
}

await main();