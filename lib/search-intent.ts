/**
 * Understands everyday Malaysian search phrases so "mall", "kedai makan dekat PJ" or "petrol near me"
 * find real places of that kind instead of only places whose NAME contains the word.
 */
export type Intent = {key:string;label:string;tags:string[];placeText:string;nearMe:boolean};

/** Categories: display label, OpenStreetMap tags (Photon `osm_tag` filters), and the words people type (English + Bahasa Melayu). */
export const searchCategories:{key:string;label:string;tags:string[];words:string[]}[]=[
 {key:'Mall',label:'Malls',tags:['shop:mall','shop:department_store'],words:['mall','malls','shopping mall','shopping malls','shopping centre','shopping center','shopping','pusat beli belah','pusat membeli belah','kompleks beli belah']},
 {key:'Restaurant',label:'Restaurants',tags:['amenity:restaurant','amenity:fast_food','amenity:food_court'],words:['restaurant','restaurants','restoran','kedai makan','tempat makan','makan','food','makanan','mamak','warung','gerai','food court','medan selera','fast food','eat']},
 {key:'Cafe',label:'Cafes',tags:['amenity:cafe'],words:['cafe','cafes','café','coffee','coffee shop','kopi','kedai kopi','kopitiam']},
 {key:'Petrol',label:'Petrol stations',tags:['amenity:fuel'],words:['petrol','petrol station','petrol stations','stesen minyak','minyak','gas station','fuel','isi minyak']},
 {key:'EV charging',label:'EV charging',tags:['amenity:charging_station'],words:['ev','ev charger','ev charging','charging','charging station','pengecas ev','cas ev']},
 {key:'Hospital',label:'Hospitals & clinics',tags:['amenity:hospital','amenity:clinic','amenity:doctors'],words:['hospital','hospitals','klinik','clinic','clinics','doctor','doktor','klinik kesihatan','emergency','kecemasan']},
 {key:'Pharmacy',label:'Pharmacies',tags:['amenity:pharmacy'],words:['pharmacy','pharmacies','farmasi','kedai ubat','chemist']},
 {key:'ATM',label:'ATMs & banks',tags:['amenity:atm','amenity:bank'],words:['atm','atms','bank','banks','mesin atm','cdm']},
 {key:'Hotel',label:'Hotels & stays',tags:['tourism:hotel','tourism:guest_house','tourism:hostel','tourism:motel'],words:['hotel','hotels','homestay','penginapan','tempat tidur','hostel','motel','resort','inap']},
 {key:'Surau',label:'Mosques & surau',tags:['amenity:place_of_worship'],words:['surau','masjid','mosque','mosques','prayer room','tempat solat','solat']},
 {key:'Parking',label:'Parking',tags:['amenity:parking'],words:['parking','parkir','car park','letak kereta','tempat letak kereta']},
 {key:'Toilet',label:'Toilets',tags:['amenity:toilets'],words:['toilet','toilets','tandas','restroom']},
 {key:'Supermarket',label:'Supermarkets',tags:['shop:supermarket','shop:convenience'],words:['supermarket','supermarkets','pasaraya','grocery','groceries','barang dapur','kedai runcit','runcit','convenience store','7-eleven','7 eleven','kedai serbaneka']},
 {key:'Transit',label:'Stations & stops',tags:['railway:station','railway:halt','highway:bus_stop','amenity:bus_station'],words:['station','stations','stesen','lrt','mrt','ktm','monorail','train','train station','stesen keretapi','keretapi','bus stop','bus stops','hentian bas','perhentian bas','stesen bas','bus station','bas']},
 {key:'Rest stop',label:'Rest areas (R&R)',tags:['highway:rest_area','highway:services'],words:['r&r','rnr','r & r','rest area','rest stop','hentian rehat','kawasan rehat']},
 {key:'Police',label:'Police stations',tags:['amenity:police'],words:['police','police station','balai polis','polis']},
 {key:'Post office',label:'Post offices',tags:['amenity:post_office'],words:['post office','pejabat pos','pos malaysia']},
 {key:'School',label:'Schools',tags:['amenity:school'],words:['school','schools','sekolah']},
 {key:'University',label:'Universities & colleges',tags:['amenity:university','amenity:college'],words:['university','universities','universiti','college','kolej','uni']},
 {key:'Park',label:'Parks',tags:['leisure:park'],words:['park','parks','taman rekreasi','playground']},
 {key:'Things to do',label:'Things to do',tags:['tourism:attraction','tourism:museum','tourism:viewpoint','tourism:theme_park'],words:['things to do','tempat menarik','attraction','attractions','tourist','pelancongan','museum','muzium']},
 {key:'Cinema',label:'Cinemas',tags:['amenity:cinema'],words:['cinema','cinemas','wayang','panggung wayang','movie','movies']},
 {key:'Gym',label:'Gyms',tags:['leisure:fitness_centre'],words:['gym','gyms','fitness','gimnasium']},
];

/** Shortforms that mean a whole place (used only when they are the whole place text, so "JB Sentral" stays as typed). */
const placeAliases:Record<string,string>={kl:'Kuala Lumpur',jb:'Johor Bahru',pj:'Petaling Jaya',kk:'Kota Kinabalu',kb:'Kota Bharu',kt:'Kuala Terengganu',sa:'Shah Alam','s.alam':'Shah Alam',ns:'Negeri Sembilan',cj:'Cyberjaya',pjy:'Putrajaya','1u':'1 Utama',mv:'Mid Valley Megamall',klcc:'KLCC',bb:'Bukit Bintang',ag:'Alor Gajah',tpg:'Taiping',sp:'Sungai Petani',bm:'Bukit Mertajam'};
/** Common address abbreviations, expanded word by word. */
const wordAliases:Record<string,string>={jln:'jalan',jl:'jalan',tmn:'taman',kg:'kampung',kpg:'kampung',lrg:'lorong',sg:'sungai',sgi:'sungai',bdr:'bandar',bkt:'bukit',bt:'batu',psn:'persiaran',pers:'persiaran',lbh:'lebuh',lbuh:'lebuh',sek:'seksyen',ssk:'seksyen',kws:'kawasan',mcd:"mcdonald's",mekdi:"mcdonald's",starbuck:'starbucks',sbux:'starbucks',pkg:'pangsapuri'};

const nearMePhrases=['near me','nearby','near here','around me','around here','closest','nearest','terdekat','berdekatan','dekat sini','dekat saya','kat sini','sini','sekitar sini'];
const connectors=['near to','near','in','at','around','close to','di','dekat','dkt','kat','sekitar','berhampiran','area','kawasan'];
const clean=(s:string)=>s.toLocaleLowerCase().replace(/[’']/g,"'").replace(/[^\p{L}\p{N}&'.\- ]+/gu,' ').replace(/\s+/g,' ').trim();

/** Expands abbreviations so the search provider sees full words ("jln ss2" → "jalan ss2", "jb" → "Johor Bahru"). */
export function expandQuery(q:string){
 const t=clean(q);if(placeAliases[t])return placeAliases[t];
 return t.split(' ').map(w=>wordAliases[w]||w).join(' ');
}

// "<place> <kind>" is only read as a category search for words that rarely end a real name,
// and never when the text starts like a named place ("Taman Universiti", "Jalan Hotel", "Masjid Negara").
const trailingWords=new Set(['mall','malls','shopping mall','petrol','stesen minyak','restoran','restaurant','restaurants','kedai makan','makan','mamak','food','cafe','kopi','atm','atms','klinik','clinic','farmasi','pharmacy','surau','tandas','toilet','parking','parkir','r&r','rnr','homestay','hotel','hotels','pasaraya','supermarket','ev','ev charger','gym','cinema','wayang','lrt','mrt','ktm']);
const namePrefixes=new Set(['taman','jalan','lorong','persiaran','lebuh','lebuhraya','kampung','bandar','menara','wisma','bangunan','plaza','kompleks','pusat','masjid','surau','sekolah','universiti','kolej','hospital','klinik','stesen','hentian','dewan','balai','pejabat','seksyen','desa','pangsapuri','kondominium','flat','the','sri','seri']);
// Longest phrases first so "shopping mall" wins over "mall", "bus stop" over "bus".
const phraseIndex=searchCategories.flatMap(c=>c.words.map(w=>({w:clean(w),c}))).sort((a,b)=>b.w.length-a.w.length);

/**
 * Returns a category intent when the text is a kind of place, optionally with where:
 * "mall" · "mall near me" · "malls in jb" · "kedai makan dekat pj" · "petrol shah alam" · "jb mall".
 * Returns null for ordinary names ("Sunway Pyramid", "Jalan Ampang").
 */
export function parseIntent(q:string):Intent|null{
 let t=clean(q);if(!t)return null;
 let nearMe=false;for(const p of nearMePhrases){const re=new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\s|$)`);if(re.test(t)){nearMe=true;t=t.replace(re,' ').replace(/\s+/g,' ').trim()}}
 for(const {w,c} of phraseIndex){
  if(t===w)return {key:c.key,label:c.label,tags:c.tags,placeText:'',nearMe};
  // category first: "mall in jb", "petrol shah alam"
  if(t.startsWith(w+' ')){let rest=t.slice(w.length).trim();for(const k of connectors)if(rest.startsWith(k+' ')){rest=rest.slice(k.length).trim();break}if(rest&&!searchCategories.some(x=>x.words.includes(rest)))return {key:c.key,label:c.label,tags:c.tags,placeText:placeAliases[rest]||expandQuery(rest),nearMe}}
  // place first: "jb mall", "shah alam petrol" (only short trailing category words, to keep names like "Sunway Pyramid Mall" searchable by name too)
  if(t.endsWith(' '+w)&&trailingWords.has(w)){const rest=t.slice(0,-w.length).trim().replace(/\s(di|dekat|kat|near|in)$/,'');if(rest&&!namePrefixes.has(rest.split(' ')[0]))return {key:c.key,label:c.label,tags:c.tags,placeText:placeAliases[rest]||expandQuery(rest),nearMe}}
 }
 return null;
}
