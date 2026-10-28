package com.sunantongsan.xian2;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
final class GamePatch {
 static final int ENGINE=88;
 private static SharedPreferences prefs(Context c){return c.getSharedPreferences("patch",0);}
 private static File folder(Context c,String id){return id.matches("p-[a-zA-Z0-9-]+")?new File(c.getFilesDir(),id):null;}
 static synchronized File active(Context c){File f=folder(c,prefs(c).getString("active",""));return f!=null&&f.isDirectory()?f:null;}
 static synchronized String version(Context c){try{File f=active(c);try(InputStream in=f==null?c.getAssets().open("release.json"):new FileInputStream(new File(f,"patch.json"))){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(out.size()+n>1024*1024)throw new IOException();out.write(b,0,n);}String v=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8)).getString("version");UpdateManifest.versionParts(v);return v;}}catch(Exception e){return "0.0.0";}}
 static synchronized String blocked(Context c){return prefs(c).getString("blockedVersion","");}
 static synchronized boolean pending(Context c){return prefs(c).getBoolean("pending",false);}
 static synchronized boolean recover(Context c){if(!pending(c))return false;return rollback(c);}
 static synchronized boolean rollback(Context c){
  SharedPreferences p=prefs(c);String bad=version(c),previous=p.getString("previous","");File f=folder(c,previous);
  SharedPreferences.Editor edit=p.edit().putString("blockedVersion",bad).remove("pending").remove("previous");
  if(f!=null&&f.isDirectory())edit.putString("active",previous);else edit.remove("active");
  return edit.commit();
 }
 static synchronized void healthy(Context c){if(prefs(c).edit().remove("pending").commit())prune(c);}
 static synchronized void reset(Context c){String v=version(c);prefs(c).edit().remove("active").remove("previous").remove("pending").putString("blockedVersion",v).commit();prune(c);}
 private static void prune(Context c){SharedPreferences p=prefs(c);String current=p.getString("active",""),previous=p.getString("previous","");File[] files=c.getFilesDir().listFiles();if(files!=null)for(File f:files)if(f.getName().startsWith("p-")&&!f.getName().equals(current)&&!f.getName().equals(previous))remove(f);}
 static void remove(File f){if(f.isDirectory()){File[] files=f.listFiles();if(files!=null)for(File child:files)remove(child);}f.delete();}
 static String install(Context c,Uri uri)throws Exception{try(InputStream in=c.getContentResolver().openInputStream(uri)){return installStream(c,in,null,null);}}
 static String installDownloaded(Context c,File file,String expected,AutoUpdater updater)throws Exception{try(InputStream in=new FileInputStream(file)){return installStream(c,in,expected,updater);}}
 static synchronized String installStream(Context c,InputStream input,String expected,AutoUpdater updater)throws Exception{
  File dir=new File(c.getFilesDir(),"p-"+UUID.randomUUID());if(!dir.mkdir())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  try{
   if(input==null)throw new IOException("เปิดไฟล์แพตช์ไม่ได้");String version=PatchArchive.extract(input,dir);UpdateManifest.versionParts(version);
   if(expected!=null&&!expected.equals(version))throw new IOException("รุ่นในไฟล์ไม่ตรงกับรายการอัปเดต");
   if(updater!=null)updater.checkCancelled();SharedPreferences p=prefs(c);
   if(!p.edit().putString("previous",p.getString("active","")).putString("active",dir.getName()).putBoolean("pending",true).commit())throw new IOException("บันทึกแพตช์ไม่ได้");
   return version;
  }catch(Exception e){remove(dir);throw e;}
 }
}
