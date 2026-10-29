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
 private final Connections connections;
 private final AtomicBoolean cancelled=new AtomicBoolean();
 private volatile HttpURLConnection active;
 AutoUpdater(){this(url->(HttpURLConnection)url.openConnection());}
 AutoUpdater(Connections connections){this.connections=connections;}
 void cancel(){cancelled.set(true);HttpURLConnection c=active;if(c!=null)c.disconnect();}
 void checkCancelled()throws IOException{if(cancelled.get()||Thread.currentThread().isInterrupted())throw new IOException("ยกเลิกการอัปเดต");}
 private HttpURLConnection open(String path)throws IOException{
  checkCancelled();HttpURLConnection c=connections.open(new URL(BASE+path));active=c;
  c.setConnectTimeout(5000);c.setReadTimeout(8000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Accept-Encoding","identity");c.setRequestProperty("Cache-Control","no-cache");
  try{checkCancelled();if(c.getResponseCode()!=200)throw new IOException("เซิร์ฟเวอร์แพตช์ยังไม่พร้อม");return c;}catch(IOException e){c.disconnect();active=null;throw e;}
 }
 UpdateManifest latest()throws Exception{
  HttpURLConnection c=open("latest.json");
  try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1){checkCancelled();if(out.size()+n>32768)throw new IOException("ข้อมูลอัปเดตใหญ่เกินกำหนด");out.write(bytes,0,n);}
   return new UpdateManifest(new String(out.toByteArray(),StandardCharsets.UTF_8));
  }finally{c.disconnect();active=null;}
 }
 File download(UpdateManifest manifest,File cache,Progress progress)throws Exception{
  File file=File.createTempFile("cockro-update-",".zip",cache);HttpURLConnection c=null;boolean complete=false;
  try{
   c=open(manifest.path);long length=c.getContentLengthLong();if(length>=0&&length!=manifest.size)throw new IOException("ขนาดไฟล์แพตช์ไม่ตรง");
   MessageDigest digest=MessageDigest.getInstance("SHA-256");long count=0,deadline=System.nanoTime()+120_000_000_000L;
   try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(file)){
    byte[] buffer=new byte[32768];int n;while((n=in.read(buffer))!=-1){checkCancelled();if(System.nanoTime()>deadline)throw new IOException("ดาวน์โหลดนานเกินกำหนด");count+=n;if(count>manifest.size)throw new IOException("ไฟล์แพตช์ใหญ่เกินกำหนด");out.write(buffer,0,n);digest.update(buffer,0,n);progress.update(count,manifest.size);}out.getFD().sync();
   }
   checkCancelled();if(count!=manifest.size||!hex(digest.digest()).equals(manifest.sha256))throw new IOException("ไฟล์ดาวน์โหลดไม่ครบหรือเสียหาย");complete=true;return file;
  }finally{if(c!=null)c.disconnect();active=null;if(!complete)file.delete();}
 }
 static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
}
