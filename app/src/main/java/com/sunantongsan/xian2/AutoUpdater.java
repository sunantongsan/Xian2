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
 void cancel(){cancelled.set(true);HttpURLConnection c=active;if(c!=null){Thread t=new Thread(c::disconnect,"cockro-pause-update");t.setDaemon(true);t.start();}}
 void checkCancelled()throws IOException{if(cancelled.get()||Thread.currentThread().isInterrupted())throw new IOException("พักการดาวน์โหลดแล้ว");}
 private HttpURLConnection open(String path,long offset)throws IOException{
  checkCancelled();HttpURLConnection c=connections.open(new URL(BASE+path));active=c;
  c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Accept-Encoding","identity");c.setRequestProperty("Cache-Control","no-cache");
  if(offset>0)c.setRequestProperty("Range","bytes="+offset+"-");
  return c;
 }
 UpdateManifest latest()throws Exception{
  HttpURLConnection c=open("latest.json",0);
  try{if(c.getResponseCode()!=200)throw new IOException("เซิร์ฟเวอร์แพตช์ยังไม่พร้อม");
   try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
    byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1){checkCancelled();if(out.size()+n>32768)throw new IOException("ข้อมูลอัปเดตใหญ่เกินกำหนด");out.write(bytes,0,n);}
    return new UpdateManifest(new String(out.toByteArray(),StandardCharsets.UTF_8));
   }
  }finally{c.disconnect();active=null;}
 }
 File download(UpdateManifest m,File directory,Progress progress)throws Exception{
  if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  File file=new File(directory,"cockro-update-"+m.sha256+".part");
  File[] old=directory.listFiles();if(old!=null)for(File f:old)if(f.getName().matches("cockro-update-[a-f0-9]{64}\\.part")&&!f.equals(file))f.delete();
  if(file.length()>m.size)file.delete();
  IOException failure=null;
  for(int attempt=0;attempt<3&&file.length()<m.size;attempt++){
   checkCancelled();HttpURLConnection c=null;
   try{
    long offset=file.length();progress.update(offset,m.size);c=open(m.path,offset);int code=c.getResponseCode();
    if(code!=200&&code!=206)throw new IOException("เซิร์ฟเวอร์แพตช์ยังไม่พร้อม ("+code+")");
    if(code==206){String range=c.getHeaderField("Content-Range");String expected="bytes "+offset+"-"+(m.size-1)+"/"+m.size;if(!expected.equals(range))throw new IOException("ตำแหน่งไฟล์ดาวน์โหลดไม่ตรง");}
    // A server without Range support may return the entire file; never append it.
    if(code==200)offset=0;
    long length=c.getContentLengthLong();if(length>=0&&length!=m.size-offset)throw new IOException("ขนาดไฟล์แพตช์ไม่ตรง");
    try(InputStream in=c.getInputStream();RandomAccessFile out=new RandomAccessFile(file,"rw")){
     if(offset==0)out.setLength(0);out.seek(offset);long count=offset;byte[] buffer=new byte[32768];int n;
     try{while((n=in.read(buffer))!=-1){checkCancelled();if(count+n>m.size)throw new IOException("ไฟล์แพตช์ใหญ่เกินกำหนด");out.write(buffer,0,n);count+=n;progress.update(count,m.size);}}
     finally{out.getFD().sync();}
     if(count!=m.size)throw new IOException("อินเทอร์เน็ตสะดุด เก็บไฟล์ไว้โหลดต่อแล้ว");
    }
   }catch(IOException e){failure=e;checkCancelled();}
   finally{if(c!=null)c.disconnect();active=null;}
  }
  checkCancelled();if(file.length()!=m.size)throw failure!=null?failure:new IOException("ไฟล์ยังไม่ครบ กรุณากดโหลดต่อ");
  MessageDigest digest=MessageDigest.getInstance("SHA-256");
  try(InputStream in=new FileInputStream(file)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){checkCancelled();digest.update(b,0,n);}}
  if(!hex(digest.digest()).equals(m.sha256)){file.delete();throw new IOException("ไฟล์เสียหาย กรุณาดาวน์โหลดใหม่");}
  progress.update(m.size,m.size);return file;
 }
 static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
}
