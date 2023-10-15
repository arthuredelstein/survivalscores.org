import { collectAllData } from './collect.js';
import { renderSite } from './render.js';

const main = async () => {
  const { aggregatedData, populationData } = await collectAllData();
  renderSite({ aggregatedData, populationData });
}

await main();