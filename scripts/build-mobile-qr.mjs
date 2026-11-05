import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';
export const mobileUrl='https://laluan-malaysia-journey.nursyahkinah00.chatgpt.site/explore';
await writeFile('public/mobile-qr.svg',await QRCode.toString(mobileUrl,{type:'svg',errorCorrectionLevel:'M',margin:4,width:288,color:{dark:'#21152fff',light:'#ffffffff'}}));
await QRCode.toFile('public/mobile-qr.png',mobileUrl,{errorCorrectionLevel:'M',margin:4,width:576,color:{dark:'#21152fff',light:'#ffffffff'}});
console.log('Generated mobile QR for '+mobileUrl);
