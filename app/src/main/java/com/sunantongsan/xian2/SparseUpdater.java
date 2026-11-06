package com.sunantongsan.xian2;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import org.json.*;
/** Reuses verified local assets, fetching only missing content-addressed files. */
final class SparseUpdater {
 interface Source { InputStream open(String name)throws IOException; }
 static final long MAX_FILE=32L*1024*1024,MAX_TOTAL=128L*1024*1024;
 static UpdateManifest payload(JSONObject p,UpdateManifest release)throws Exception{
  return new UpdateManifest(new JSONObject().put("game","cockro").put("engine",88).put("version",release.version).put("minAppVersionCode",release.minApp).put("path",p.getString("path")).put("size",p.getLong("size")).put("sha256",p.getString("sha256")).toString());
 }
 static String hash(File f,AutoUpdater u)throws Exception{MessageDigest md=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(f)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){u.checkCancelled();md.update(b,0,n);}}return AutoUpdater.hex(md.digest());}
 static void copy(InputStream in,OutputStream out,long max,AutoUpdater u)throws Exception{byte[] b=new byte[32768];int n;long size=0;while((n=in.read(b))!=-1){u.checkCancelled();size+=n;if(size>max)throw new IOException("ไฟล์ใหญ่เกินกำหนด");out.write(b,0,n);}}
 static void unpackOne(File zip,String name,File target,long max,AutoUpdater u)throws Exception{
  try(ZipInputStream in=new ZipInputStream(new FileInputStream(zip));OutputStream out=new FileOutputStream(target)){
   ZipEntry e=in.getNextEntry();if(e==null||e.isDirectory()||!name.equals(e.getName()))throw new IOException("ไฟล์อัปเดตไม่ตรงรายการ");copy(in,out,max,u);if(in.getNextEntry()!=null)throw new IOException("รายการไฟล์เกินกำหนด");
  }
 }
 static boolean safeName(String name){return name.matches("[A-Za-z0-9_./-]+")&&!name.startsWith("/")&&!name.contains("..")&&!name.equals("patch.json")&&name.matches(".*\\.(html|js|css|json|webp|ttf|txt|ogg|mp3|wav|svg)$");}
 static File download(AutoUpdater u,UpdateManifest release,File directory,Source source,AutoUpdater.Progress progress)throws Exception{
  if(release.sparse==null)return u.download(release,directory,progress);
  if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  File work=new File(directory,"sparse-"+release.sha256);if(!work.isDirectory()&&!work.mkdirs())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  File[] old=directory.listFiles();if(old!=null)for(File f:old)if(f.getName().startsWith("sparse-")&&!f.equals(work))GamePatch.remove(f);
  UpdateManifest manifestPayload=payload(release.sparse,release);
  if(manifestPayload.size>1024*1024)throw new IOException("รายการไฟล์ใหญ่เกินกำหนด");
  File meta=new File(work,"manifest.json");File zip=u.download(manifestPayload,new File(work,"transfer"),(d,t)->{});
  unpackOne(zip,"manifest.json",meta,1024*1024,u);zip.delete();
  JSONObject index=new JSONObject(new String(java.nio.file.Files.readAllBytes(meta.toPath()),StandardCharsets.UTF_8));
  if(!release.version.equals(index.getString("version"))||!"cockro".equals(index.getString("game"))||index.getInt("engine")!=88)throw new IOException("รุ่นรายการไฟล์ไม่ตรง");
  JSONObject entries=index.getJSONObject("files");if(entries.length()<4||entries.length()>1999)throw new IOException("รายการไฟล์ไม่ครบ");
  for(String name:new String[]{"index.html","game.js","core.js","style.css"})if(!entries.has(name))throw new IOException("รายการไฟล์ไม่ครบ");
  List<String> names=new ArrayList<>();entries.keys().forEachRemaining(names::add);Collections.sort(names);
  Map<String,File> local=new HashMap<>();List<String> missing=new ArrayList<>();long totalBytes=0,totalDownload=0;
  for(String name:names){u.checkCancelled();if(!safeName(name))throw new IOException("ชื่อไฟล์ไม่ถูกต้อง");JSONObject entry=entries.getJSONObject(name);String digest=entry.getString("hash");long size=entry.getLong("bytes");
   if(!digest.matches("[a-f0-9]{64}")||size<0||size>MAX_FILE||(totalBytes+=size)>MAX_TOTAL)throw new IOException("ขนาดไฟล์ไม่ถูกต้อง");
   UpdateManifest asset=payload(entry,release);File cached=new File(work,digest+".asset");
   if(!cached.isFile()||cached.length()!=size||!hash(cached,u).equals(digest)){
    cached.delete();File tmp=new File(work,"reuse.tmp");boolean copied=false;
    try(InputStream in=source.open(name);OutputStream out=new FileOutputStream(tmp)){copy(in,out,size,u);copied=true;}catch(IOException unavailable){u.checkCancelled();}
    if(copied&&tmp.length()==size&&hash(tmp,u).equals(digest)){if(!tmp.renameTo(cached))throw new IOException("จัดเก็บไฟล์ไม่ได้");}else tmp.delete();
   }
   local.put(name,cached);if(!cached.isFile()){missing.add(name);totalDownload+=asset.size;}
  }
  final long total=Math.max(1,totalDownload);long done=0;progress.update(0,total);
  for(String name:missing){JSONObject entry=entries.getJSONObject(name);UpdateManifest asset=payload(entry,release);final long offset=done;
   zip=u.download(asset,new File(work,"transfer"),(d,t)->progress.update(offset+d,total));File tmp=new File(work,"asset.tmp");
   try{unpackOne(zip,name,tmp,entry.getLong("bytes"),u);if(tmp.length()!=entry.getLong("bytes")||!hash(tmp,u).equals(entry.getString("hash")))throw new IOException("ไฟล์อัปเดตเสียหาย");if(!tmp.renameTo(local.get(name)))throw new IOException("จัดเก็บไฟล์ไม่ได้");}finally{tmp.delete();}
   zip.delete();done+=asset.size;
  }
  JSONObject files=new JSONObject();File assembled=new File(directory,"sparse-bundle.zip");
  try(ZipOutputStream out=new ZipOutputStream(new FileOutputStream(assembled))){for(String name:names){u.checkCancelled();out.putNextEntry(new ZipEntry(name));try(InputStream in=new FileInputStream(local.get(name))){copy(in,out,MAX_FILE,u);}out.closeEntry();files.put(name,entries.getJSONObject(name).getString("hash"));}
   out.putNextEntry(new ZipEntry("patch.json"));out.write(new JSONObject().put("game","cockro").put("engine",88).put("version",release.version).put("files",files).toString().getBytes(StandardCharsets.UTF_8));out.closeEntry();
  }catch(Exception e){assembled.delete();throw e;}
  u.checkCancelled();progress.update(total,total);return assembled;
 }
}
