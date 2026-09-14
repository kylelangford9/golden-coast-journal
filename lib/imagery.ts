export type EditorialAsset = {
  url: string;
  alt: string;
  credit: string;
  provenanceUrl: string;
  kind: 'photograph' | 'source-graphic';
  aiGenerated: false;
};

export const editorialAssets = {
  californiaPowerLines: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Path_27_Power_Lines_in_California_0.JPG/1280px-Path_27_Power_Lines_in_California_0.JPG?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
    alt: 'High-voltage power lines running beside Interstate 15 in California',
    credit: 'Northwalker / Wikimedia Commons (CC0)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:Path_27_Power_Lines_in_California_0.JPG',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaStateCapitol: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    alt: 'California State Capitol in Sacramento beneath a clear blue sky',
    credit: 'Earthquakesurprise / Wikimedia Commons (CC0)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:CA_State_Capitol.png',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaCoast: {
    url: '/california-coast.jpg',
    alt: 'Aerial photograph of Santa Barbara, California, meeting the Pacific Ocean',
    credit: 'Clayton Cardinalli / Unsplash',
    provenanceUrl:
      'https://unsplash.com/photos/aerial-view-of-city-during-daytime-BTAU-92ZeZc',
    kind: 'photograph',
    aiGenerated: false,
  },
  lakeOroville: {
    url: '/oroville.jpg',
    alt: 'Aerial photograph of Lake Oroville and the surrounding California foothills',
    credit: 'Florence Low / California Department of Water Resources',
    provenanceUrl:
      'https://water.ca.gov/-/media/CWC-Website/Files/Documents/2023/2022_SWPAnnualReview_Final.pdf',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaAiSafeguards: {
    url: '/ai-safeguards.png',
    alt: 'Official graphic announcing California artificial intelligence safeguards',
    credit: 'Office of the Governor of California',
    provenanceUrl: 'https://www.gov.ca.gov/newsroom/',
    kind: 'source-graphic',
    aiGenerated: false,
  },
} as const satisfies Record<string, EditorialAsset>;

const assetsByUrl = new Map<string, EditorialAsset>(
  Object.values(editorialAssets).map((asset) => [asset.url, asset]),
);

export function getApprovedEditorialAsset(
  url: string | null | undefined,
): EditorialAsset {
  return (url && assetsByUrl.get(url)) || editorialAssets.californiaCoast;
}

export function editorialAssetLabel(asset: EditorialAsset) {
  return asset.kind === 'photograph' ? 'Photograph' : 'Source graphic';
}
