package com.sunantongsan.xian2;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
final class AutoUpdater {
 static final String BASE="https://cockro-game-updates.vercel.app/";
 interface Connections{HttpURLConnection open(URL url)throws IOException;}
 interface Progress{void update(long done,long total);}
 private static final Object DOWNLOAD_LOCK=new Object();
 private final Connections connections;
 private final AtomicBoolean cancelled=new AtomicBoolean();
 private volatile HttpURLConnection active;
 AutoUpdater(){this(url->(HttpURLConnection)url.openConnection());}
 AutoUpdater(Connections connections){this.connections=connections;}
 void cancel(){cancelled.set(true);HttpURLConnection c=active;if(c!=null){Thread cleanup=new Thread(c::disconnect,"cockro-cancel-update");cleanup.setDaemon(true);cleanup.start();}}
 void checkCancelled()throws IOException{if(cancelled.get()||Thread.currentThread().isInterrupted())throw new IOException("ยกเลิกการอัปเดต");}
 private HttpURLConnection open(String path)throws IOException{return open(path,0);}
 private HttpURLConnection open(String path,long offset)throws IOException{
  checkCancelled();HttpURLConnection c=connections.open(new URL(BASE+path));active=c;
  c.setConnectTimeout(5000);c.setReadTimeout(8000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Accept-Encoding","identity");c.setRequestProperty("Cache-Control","no-cache");
  if(offset>0)c.setRequestProperty("Range","bytes="+offset+"-");
  try{checkCancelled();int code=c.getResponseCode();if(code!=200&&!(offset>0&&(code==206||code==416)))throw new IOException("เซิร์ฟเวอร์แพตช์ยังไม่พร้อม");return c;}catch(IOException e){c.disconnect();active=null;throw e;}
 }
 UpdateManifest latest()throws Exception{
  HttpURLConnection c=open("latest.json");
  try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1){checkCancelled();if(out.size()+n>32768)throw new IOException("ข้อมูลอัปเดตใหญ่เกินกำหนด");out.write(bytes,0,n);}
   return new UpdateManifest(new String(out.toByteArray(),StandardCharsets.UTF_8));
  }finally{c.disconnect();active=null;}
 }
 // One writer per process, including activity recreation while cancellation drains.
 File download(UpdateManifest manifest,File cache,Progress progress)throws Exception{
  synchronized(DOWNLOAD_LOCK){return downloadLocked(manifest,cache,progress);}
 }
 private File downloadLocked(UpdateManifest manifest,File cache,Progress progress)throws Exception{
  checkCancelled();
  if(!cache.isDirectory()&&!cache.mkdirs())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  File file=new File(cache,"cockro-update-"+manifest.sha256+".part");
  // Content-addressing prevents combining bytes from different releases. Keep
  // only this manifest's partial file, bounding retained storage to one patch.
  File[] stale=cache.listFiles();if(stale!=null)for(File old:stale)if(old.getName().matches("cockro-update-[a-f0-9]{64}\\.part")&&!old.equals(file))old.delete();
  if(file.length()>manifest.size&&!file.delete())throw new IOException("ล้างไฟล์แพตช์เก่าไม่ได้");
  HttpURLConnection c=null;
  try{
   MessageDigest digest=MessageDigest.getInstance("SHA-256");long count=0;
   if(file.isFile())try(InputStream prefix=new FileInputStream(file)){byte[] b=new byte[32768];int n;while((n=prefix.read(b))!=-1){checkCancelled();digest.update(b,0,n);count+=n;}}
   if(count==manifest.size){
    if(hex(digest.digest()).equals(manifest.sha256)){progress.update(count,manifest.size);return file;}
    if(!file.delete())throw new IOException("ล้างไฟล์แพตช์เสียไม่ได้");count=0;digest=MessageDigest.getInstance("SHA-256");
   }
   c=open(manifest.path,count);
   if(c.getResponseCode()==416){
    // A server can reject a stale Range. Retry once from zero, never append.
    c.disconnect();active=null;if(!file.delete())throw new IOException("ล้างไฟล์แพตช์เก่าไม่ได้");
    count=0;digest=MessageDigest.getInstance("SHA-256");c=open(manifest.path);
   }
   String encoding=c.getContentEncoding();if(encoding!=null&&!encoding.equalsIgnoreCase("identity"))throw new InvalidDownload("รูปแบบข้อมูลแพตช์ไม่รองรับ");
   if(c.getResponseCode()==206){
    String expected="bytes "+count+"-"+(manifest.size-1)+"/"+manifest.size;
    if(!expected.equals(c.getHeaderField("Content-Range")))throw new InvalidDownload("ช่วงไฟล์แพตช์ไม่ตรง");
   }else{
    // Server ignored Range: consume its full 200 response from byte zero,
    // never append it to the saved prefix.
    count=0;digest=MessageDigest.getInstance("SHA-256");
   }
   long length=c.getContentLengthLong();if(length>=0&&length!=manifest.size-count)throw new InvalidDownload("ขนาดไฟล์แพตช์ไม่ตรง");
   progress.update(count,manifest.size);
   // Read timeout measures inactivity, not total transfer duration. A slow
   // connection that keeps receiving bytes may finish without a wall-clock cap.
   try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(file,count>0)){
    byte[] buffer=new byte[32768];int n;while((n=in.read(buffer))!=-1){checkCancelled();if(count+n>manifest.size)throw new InvalidDownload("ไฟล์แพตช์ใหญ่เกินกำหนด");out.write(buffer,0,n);count+=n;digest.update(buffer,0,n);progress.update(count,manifest.size);}out.getFD().sync();
   }
   checkCancelled();if(count!=manifest.size)throw new EOFException("ดาวน์โหลดไม่ครบ เก็บไว้โหลดต่อครั้งหน้า");
   if(!hex(digest.digest()).equals(manifest.sha256))throw new InvalidDownload("ไฟล์ดาวน์โหลดเสียหาย กรุณาโหลดใหม่");
   return file;
  }catch(InvalidDownload e){file.delete();throw e;}
  finally{if(c!=null)c.disconnect();active=null;}
 }
 private static final class InvalidDownload extends IOException{InvalidDownload(String message){super(message);}}
 static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
}



