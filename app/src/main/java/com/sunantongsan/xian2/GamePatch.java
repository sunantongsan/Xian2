package com.sunantongsan.xian2;
import android.content.Context;
import android.net.Uri;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** User-selected data bundles only; no native code or remote bridge. */
final class GamePatch {
 static final int ENGINE=88;
 static File active(Context c){String id=c.getSharedPreferences("patch",0).getString("active","");return id.matches("p-[0-9]+")?new File(c.getFilesDir(),id):null;}
 static void reset(Context c){c.getSharedPreferences("patch",0).edit().remove("active").commit();}
 static void remove(File f){if(f.isDirectory()){File[] all=f.listFiles();if(all!=null)for(File x:all)remove(x);}f.delete();}
 static String install(Context c,Uri uri)throws Exception{
  File dir=new File(c.getFilesDir(),"p-"+System.currentTimeMillis());if(!dir.mkdir())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  try{
   Set<String> names=new HashSet<>();long total=0;
   try(InputStream raw=c.getContentResolver().openInputStream(uri);ZipInputStream z=new ZipInputStream(raw)){
    ZipEntry e;byte[] buf=new byte[32768];
    while((e=z.getNextEntry())!=null){String n=e.getName();
     if(e.isDirectory())continue;
     if(!n.matches("[A-Za-z0-9_./-]+")||n.contains("..")||n.startsWith("/")||!names.add(n)||names.size()>2000)throw new IOException("ชื่อไฟล์แพตช์ไม่ถูกต้อง");
     if(!n.matches(".*\\.(html|js|css|json|webp|ttf|txt|ogg|mp3|wav|svg)$"))throw new IOException("ชนิดไฟล์ไม่รองรับ");
     File f=new File(dir,n);if(!f.getCanonicalPath().startsWith(dir.getCanonicalPath()+File.separator))throw new IOException("Invalid path");
     File parent=f.getParentFile();if(!parent.isDirectory()&&!parent.mkdirs())throw new IOException("สร้างโฟลเดอร์ไม่ได้");
     try(OutputStream out=new FileOutputStream(f)){int len;long size=0;while((len=z.read(buf))!=-1){size+=len;total+=len;if(size>32L*1024*1024||total>128L*1024*1024)throw new IOException("แพตช์ใหญ่เกินกำหนด");out.write(buf,0,len);}}
    }
   }
   File manifest=new File(dir,"patch.json");if(manifest.length()>1024*1024)throw new IOException("Manifest too large");
   JSONObject m=new JSONObject(new String(java.nio.file.Files.readAllBytes(manifest.toPath()),StandardCharsets.UTF_8));
   if(!m.getString("game").equals("cockro")||m.getInt("engine")!=ENGINE)throw new IOException("แพตช์ไม่ตรงกับรุ่นแอป");
   JSONObject files=m.getJSONObject("files");if(files.length()!=names.size()-1)throw new IOException("รายการไฟล์ไม่ครบ");
   for(String required:new String[]{"index.html","game.js","core.js","style.css"})if(!files.has(required))throw new IOException("แพตช์ไม่ครบ");
   Iterator<String> it=files.keys();while(it.hasNext()){String n=it.next();if(n.equals("patch.json")||!names.contains(n))throw new IOException("Missing file");MessageDigest md=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(new File(dir,n))){byte[] b=new byte[32768];int len;while((len=in.read(b))!=-1)md.update(b,0,len);}StringBuilder hex=new StringBuilder();for(byte b:md.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));if(!hex.toString().equals(files.getString(n)))throw new IOException("ไฟล์เสียหาย: "+n);}
   String version=m.getString("version");
   if(!c.getSharedPreferences("patch",0).edit().putString("active",dir.getName()).commit())throw new IOException("บันทึกแพตช์ไม่ได้");
   return version;
  }catch(Exception e){remove(dir);throw e;}
 }
}
