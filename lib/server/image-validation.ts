// Bounded structural validation, not a replacement for decoding or malware scanning.
export function validImage(bytes:Uint8Array,type:string):boolean {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const text=(offset:number,length:number)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
  const dimensions=(width:number,height:number)=>width>0&&height>0&&width<=8192&&height<=8192&&width*height<=16_777_216;
  try {
    if(type==="image/png") {
      if(bytes.length<45||view.getUint32(8)!==13||text(12,4)!=="IHDR"||!dimensions(view.getUint32(16),view.getUint32(20)))return false;
      let offset=8,data=false;
      while(offset+12<=bytes.length) {
        const length=view.getUint32(offset),kind=text(offset+4,4),end=offset+12+length;
        if(end>bytes.length)return false;
        if(kind==="IDAT"&&length>0)data=true;
        if(kind==="IEND")return data&&length===0&&end===bytes.length;
        offset=end;
      }
      return false;
    }
    if(type==="image/jpeg") {
      if(bytes.length<4||bytes[0]!==255||bytes[1]!==216)return false;
      let offset=2,frame=false,scan=false;
      while(offset<bytes.length) {
        if(bytes[offset++]!==255)return false;
        while(bytes[offset]===255)offset++;
        const marker=bytes[offset++];
        if(marker===217)return frame&&scan&&offset===bytes.length;
        if(marker===0||marker===216)return false;
        if(marker===1||(marker>=208&&marker<=215))continue;
        const length=view.getUint16(offset);
        if(length<2||offset+length>bytes.length)return false;
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
          if(length<8||!dimensions(view.getUint16(offset+5),view.getUint16(offset+3)))return false;
          frame=true;
        }
        offset+=length;
        if(marker===218) {
          if(!frame)return false;
          scan=true;
          while(offset<bytes.length) {
            if(bytes[offset]!==255){offset++;continue;}
            if(bytes[offset+1]===0||(bytes[offset+1]>=208&&bytes[offset+1]<=215)){offset+=2;continue;}
            break;
          }
        }
      }
      return false;
    }
    if(type==="image/webp") {
      if(bytes.length<20||text(0,4)!=="RIFF"||text(8,4)!=="WEBP"||view.getUint32(4,true)!==bytes.length-8)return false;
      let offset=12,data=false;
      while(offset+8<=bytes.length) {
        const kind=text(offset,4),length=view.getUint32(offset+4,true),start=offset+8,end=start+length;
        if(end>bytes.length)return false;
        if(kind==="VP8 ") {
          if(length<10||text(start+3,3)!=="\u009d\u0001\u002a"||!dimensions(view.getUint16(start+6,true)&16383,view.getUint16(start+8,true)&16383))return false;
          data=true;
        } else if(kind==="VP8L") {
          if(length<5||bytes[start]!==47)return false;
          const bits=view.getUint32(start+1,true);
          if(!dimensions((bits&16383)+1,((bits>>>14)&16383)+1))return false;
          data=true;
        } else if(kind==="VP8X") {
          if(length!==10)return false;
          const width=1+bytes[start+4]+(bytes[start+5]<<8)+(bytes[start+6]<<16);
          const height=1+bytes[start+7]+(bytes[start+8]<<8)+(bytes[start+9]<<16);
          if(!dimensions(width,height))return false;
        }
        offset=end+(length%2);
      }
      return data&&offset===bytes.length;
    }
    return false;
  } catch {return false;}
}
