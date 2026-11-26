/**
 * Site-wide configuration: links, author info.
 * Update TODO values before publishing.
 */

export const SITE_CONFIG = {
  appName: 'GeoSat Intelligence',
  version: '1.6.0',
  description:
    'Annual land-cover change analysis and deep-learning classification for Tamil Nadu districts.',

  author: {
    name: 'TODO: Your Name',
    github: 'https://github.com/TODO_YOUR_GITHUB',
    linkedin: 'https://linkedin.com/in/TODO_YOUR_LINKEDIN',
  },

  links: {
    github: 'https://github.com/TODO_YOUR_GITHUB/geo-sat-project',
    esriLandCover: 'https://www.arcgis.com/home/item.html?id=d3da5dd386d140cf93fc9ecbf8da5e31',
    esriLicense: 'https://www.esri.com/en-us/legal/terms/data-attributions',
    sentinel2: 'https://sentinel.esa.int/web/sentinel/missions/sentinel-2',
    sentinel2License: 'https://sentinel.esa.int/web/sentinel/terms-conditions',
    shapefileProject: 'https://github.com/karthi209/the-shapefile-project',
    shapefileProjectLicense: 'https://github.com/karthi209/the-shapefile-project/blob/main/LICENSE',
    openstreetmap: 'https://www.openstreetmap.org/copyright',
    leaflet: 'https://leafletjs.com/',
    leafletLicense: 'https://github.com/Leaflet/Leaflet/blob/main/LICENSE',
  },
} as const;
