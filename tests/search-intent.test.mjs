import assert from 'node:assert/strict';
import {parseIntent,expandQuery} from '../lib/search-intent.ts';
import {rankPlaces,nameScore} from '../lib/place-search.ts';

const is=(q,key,placeText='',nearMe=false)=>{const r=parseIntent(q);assert.ok(r,`"${q}" should be a ${key} search`);assert.equal(r.key,key,q);assert.equal(r.placeText,placeText,q);assert.equal(r.nearMe,nearMe,q)};
// Kinds of place, alone
is('mall','Mall');is('Mall','Mall');is('malls','Mall');is('shopping mall','Mall');is('pusat beli belah','Mall');
is('restoran','Restaurant');is('kedai makan','Restaurant');is('mamak','Restaurant');is('makan','Restaurant');
is('petrol','Petrol');is('stesen minyak','Petrol');is('klinik','Hospital');is('farmasi','Pharmacy');is('atm','ATM');
is('surau','Surau');is('masjid','Surau');is('tandas','Toilet');is('pasaraya','Supermarket');is('7-eleven','Supermarket');
is('lrt','Transit');is('hentian bas','Transit');is('r&r','Rest stop');is('balai polis','Police');is('hotel','Hotel');is('homestay','Hotel');
// near me
is('mall near me','Mall','',true);is('petrol terdekat','Petrol','',true);is('kedai makan dekat sini','Restaurant','',true);is('nearest atm','ATM','',true);
// with a place
is('mall in jb','Mall','Johor Bahru');is('mall jb','Mall','Johor Bahru');is('jb mall','Mall','Johor Bahru');
is('kedai makan dekat pj','Restaurant','Petaling Jaya');is('klinik di shah alam','Hospital','shah alam');is('petrol near klcc','Petrol','KLCC');
is('hotel kk','Hotel','Kota Kinabalu');is('surau kat bangsar','Surau','bangsar');is('restaurants around bukit bintang','Restaurant','bukit bintang');
is('shah alam petrol','Petrol','shah alam');is('atm jln ampang','ATM','jalan ampang');
// Names and addresses stay name searches
for(const q of ['Sunway Pyramid','Jalan Ampang','KLCC','Menara Maybank','The Exchange TRX','Pavilion Kuala Lumpur','81300','Taman Universiti','Bangsar South'])assert.equal(parseIntent(q),null,q);
console.log('PASS: category intent in English and Bahasa Melayu, near me, and "<kind> in/dekat/di <place>"');

assert.equal(expandQuery('jb'),'Johor Bahru');assert.equal(expandQuery('KL'),'Kuala Lumpur');assert.equal(expandQuery('1u'),'1 Utama');
assert.equal(expandQuery('jln ss 2'),'jalan ss 2');assert.equal(expandQuery('Tmn Desa'),'taman desa');assert.equal(expandQuery('kg baru'),'kampung baru');
assert.equal(expandQuery('jb sentral'),'jb sentral','shortforms inside names are kept');
console.log('PASS: abbreviations (KL, JB, PJ, 1U, jln, tmn, kg) expanded only where safe');

const P=(id,name,extra={})=>({id,name,address:'',type:'Place',category:'place',lat:3,lon:101,...extra});
assert.equal(nameScore(P('1','Sunway Pyramid Shopping Mall'),'pyramid sunway'),18,'all words in any order');
assert.equal(nameScore(P('1','Mid Valley Megamall'),'mid val'),24);
assert.equal(nameScore(P('1','Café Jalan Alor'),'cafe jalan alor'),150,'accents folded');
const near=rankPlaces([P('far','Nasi Kandar Pelita',{distance:300}),P('near','Nasi Kandar Pelita',{distance:0.8})],'nasi kandar');
assert.equal(near[0].id,'near','same name: closer place first');
const exact=rankPlaces([P('a','Pelita Corner',{distance:0.5}),P('b','Nasi Kandar Pelita',{distance:12})],'nasi kandar pelita');
assert.equal(exact[0].id,'b','a much better name match still beats a closer weak match');
console.log('PASS: word-order-free matching, accent folding and distance-aware ranking');
