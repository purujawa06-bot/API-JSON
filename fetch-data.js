import * as cheerio from 'cheerio';
import { writeFile } from 'fs/promises';
import path from 'path';

async function fetchAndSaveData() {
  const targetUrl = 'https://myanimelist.net/recommendations.php?s=recentrecs&t=anime';
  console.log(`Fetching data from ${targetUrl}...`);

  try {
    const malResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://myanimelist.net/',
      }
    });

    if (!malResponse.ok) {
      throw new Error(`MyAnimeList responded with status: ${malResponse.status}`);
    }

    const html = await malResponse.text();
    const $ = cheerio.load(html);

    const recommendations = [];

    $('#content .borderClass').each((index, element) => {
      const recElement = $(element);
      if (recElement.find('table').length === 0) return;

      const sourceEl = recElement.find('td:first-child');
      const recommendedEl = recElement.find('td:last-child');

      const getImageUrl = (imgElement) => {
        const srcset = imgElement.attr('data-srcset');
        if (srcset) {
          const parts = srcset.split(',');
          if (parts.length > 1) {
            return parts[1].trim().split(' ')[0];
          }
        }
        return imgElement.attr('data-src');
      };
      
      const sourceAnime = {
        title: sourceEl.find('a > strong').text().trim(),
        url: sourceEl.find('a:has(strong)').attr('href'),
        imageUrl: getImageUrl(sourceEl.find('img')),
      };

      const recommendedAnime = {
        title: recommendedEl.find('a > strong').text().trim(),
        url: 'https://myanimelist.net' + recommendedEl.find('a:has(strong)').attr('href'),
        imageUrl: getImageUrl(recommendedEl.find('img')),
      };

      const reason = recElement.find('.recommendations-user-recs-text').text().trim();
      
      const authorInfoEl = recElement.find('.lightLink.spaceit');
      const authorInfoText = authorInfoEl.text().trim();
      const authorInfoParts = authorInfoText.split(' - ');

      const author = {
        username: authorInfoEl.find('a[href*="/profile/"]').text().trim(),
        date: authorInfoParts[1] ? authorInfoParts[1].trim() : null,
      };

      recommendations.push({
        sourceAnime,
        recommendedAnime,
        reason,
        author,
      });
    });

    const dataToSave = { recommendations };

    const outputPath = path.resolve(process.cwd(), 'anime-recs.json');
    await writeFile(outputPath, JSON.stringify(dataToSave, null, 2));
    
    console.log(`Successfully saved ${recommendations.length} recommendations to anime-recs.json`);

  } catch (error) {
    console.error('Error fetching or saving data:', error);
    process.exit(1);
  }
}

fetchAndSaveData();
