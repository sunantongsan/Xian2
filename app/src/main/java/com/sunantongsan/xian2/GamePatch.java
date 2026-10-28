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
   String version;try(InputStream raw=c.getContentResolver().openInputStream(uri)){version=PatchArchive.extract(raw,dir);}
   if(!c.getSharedPreferences("patch",0).edit().putString("active",dir.getName()).commit())throw new IOException("บันทึกแพตช์ไม่ได้");
   return version;
  }catch(Exception e){remove(dir);throw e;}
 }
}
