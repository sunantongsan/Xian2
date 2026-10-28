package com.sunantongsan.xian2;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
final class GamePatch {
 static final int ENGINE=88;
 // The storage contract lets recovery run against real files without Android lifecycle.
 interface Store{File files();String get(String key);boolean commit(Map<String,String> changes);String bundledVersion()throws Exception;}
 private static final class AndroidStore implements Store{
  final Context context;final SharedPreferences prefs;
  AndroidStore(Context c){context=c;prefs=c.getSharedPreferences("patch",0);}
  public File files(){return context.getFilesDir();}
  public String get(String key){Object value=prefs.getAll().get(key);return value==null?"":String.valueOf(value);}
  public boolean commit(Map<String,String> changes){SharedPreferences.Editor editor=prefs.edit();for(Map.Entry<String,String> e:changes.entrySet())if(e.getValue()==null)editor.remove(e.getKey());else editor.putString(e.getKey(),e.getValue());return editor.commit();}
  public String bundledVersion()throws Exception{try(InputStream in=context.getAssets().open("release.json")){return readVersion(in);}}
 }
 private static Map<String,String> changes(String... pairs){Map<String,String> result=new HashMap<>();for(int i=0;i<pairs.length;i+=2)result.put(pairs[i],pairs[i+1]);return result;}
 private static File folder(Store s,String id){return id.matches("p-[a-zA-Z0-9-]+")?new File(s.files(),id):null;}
 static File active(Context c){return active(new AndroidStore(c));}
 static String version(Context c){return version(new AndroidStore(c));}
 static String blocked(Context c){return new AndroidStore(c).get("blockedVersion");}
 static boolean pending(Context c){return pending(new AndroidStore(c));}
 static boolean recover(Context c){return recover(new AndroidStore(c));}
 static boolean rollback(Context c){return rollback(new AndroidStore(c));}
 static void healthy(Context c){healthy(new AndroidStore(c));}
 static void reset(Context c){reset(new AndroidStore(c));}
 static synchronized File active(Store s){File f=folder(s,s.get("active"));return f!=null&&f.isDirectory()?f:null;}
 static synchronized boolean pending(Store s){return "true".equals(s.get("pending"));}
 private static String readVersion(InputStream in)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(out.size()+n>1024*1024)throw new IOException("Manifest too large");out.write(b,0,n);}String v=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8)).getString("version");UpdateManifest.versionParts(v);return v;}
 static synchronized String version(Store s){try{File f=active(s);if(f==null)return s.bundledVersion();try(InputStream in=new FileInputStream(new File(f,"patch.json"))){return readVersion(in);}}catch(Exception e){return "0.0.0";}}
 static synchronized boolean recover(Store s){return pending(s)&&rollback(s);}
 static synchronized boolean rollback(Store s){File previous=folder(s,s.get("previous"));return s.commit(changes("blockedVersion",version(s),"pending",null,"previous",null,"active",previous!=null&&previous.isDirectory()?previous.getName():null));}
 static synchronized void healthy(Store s){if(s.commit(changes("pending",null)))prune(s);}
 static synchronized void reset(Store s){if(s.commit(changes("blockedVersion",version(s),"active",null,"previous",null,"pending",null)))prune(s);}
 private static void prune(Store s){String current=s.get("active"),previous=s.get("previous");File[] files=s.files().listFiles();if(files!=null)for(File f:files)if(f.getName().startsWith("p-")&&!f.getName().equals(current)&&!f.getName().equals(previous))remove(f);}
 static void remove(File f){if(f.isDirectory()){File[] files=f.listFiles();if(files!=null)for(File child:files)remove(child);}f.delete();}
 static String install(Context c,Uri uri)throws Exception{try(InputStream in=c.getContentResolver().openInputStream(uri)){return installStream(new AndroidStore(c),in,null,null);}}
 static String installDownloaded(Context c,File file,String expected,AutoUpdater updater)throws Exception{try(InputStream in=new FileInputStream(file)){return installStream(new AndroidStore(c),in,expected,updater);}}
 static synchronized String installStream(Store s,InputStream input,String expected,AutoUpdater updater)throws Exception{
  File dir=new File(s.files(),"p-"+UUID.randomUUID());if(!dir.mkdir())throw new IOException("พื้นที่จัดเก็บไม่พร้อม");
  try{
   if(input==null)throw new IOException("เปิดไฟล์แพตช์ไม่ได้");String version=PatchArchive.extract(input,dir);UpdateManifest.versionParts(version);
   if(expected!=null&&!expected.equals(version))throw new IOException("รุ่นในไฟล์ไม่ตรงกับรายการอัปเดต");
   if(updater!=null)updater.checkCancelled();
   if(!s.commit(changes("previous",s.get("active"),"active",dir.getName(),"pending","true")))throw new IOException("บันทึกแพตช์ไม่ได้");
   return version;
  }catch(Exception e){remove(dir);throw e;}
 }
}
