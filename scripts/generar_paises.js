// Genera js/paises.js con todos los países (nombre en español y en inglés).
// El nombre en inglés se usa para consultar las ciudades en la API countriesnow.
// Ejecutar: node scripts/generar_paises.js

const fs = require('fs');
const path = require('path');

const CODIGOS = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR',
  'BS','BT','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM',
  'CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB',
  'GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW',
  'GY','HK','HN','HR','HT','HU','ID','IE','IL','IM','IN','IQ','IR','IS','IT',
  'JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME',
  'MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV',
  'MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU',
  'NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW',
  'PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI',
  'SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD',
  'TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG',
  'US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA',
  'ZM','ZW'
];

const nombresEs = new Intl.DisplayNames(['es-AR'], { type: 'region' });
const nombresEn = new Intl.DisplayNames(['en'], { type: 'region' });

let paises = CODIGOS.map(c => ({ es: nombresEs.of(c), en: nombresEn.of(c) }));
paises.sort((a, b) => a.es.localeCompare(b.es, 'es'));

// Argentina primera
paises = [
  ...paises.filter(p => p.es === 'Argentina'),
  ...paises.filter(p => p.es !== 'Argentina')
];

const contenido =
  '// Lista de países generada con scripts/generar_paises.js\n' +
  '// es: nombre mostrado | en: nombre usado para buscar ciudades en countriesnow.space\n' +
  'const PAISES = ' + JSON.stringify(paises, null, 0) + ';\n';

fs.writeFileSync(path.join(__dirname, '..', 'js', 'paises.js'), contenido, 'utf8');
console.log('Generado js/paises.js con ' + paises.length + ' países');
