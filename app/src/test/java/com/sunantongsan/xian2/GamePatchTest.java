package com.sunantongsan.xian2;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import android.content.Context;
import android.net.Uri;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=28, manifest=Config.NONE, application=android.app.Application.class)
public class GamePatchTest {
 Context context;
 @Before public void before(){context=RuntimeEnvironment.getApplication();GamePatch.reset(context);}
 File bundle(boolean corrupt,int engine,String extra)throws Exception{
  File zip=File.createTempFile("patch-test", ".zip",context.getCacheDir());JSONObject files=new JSONObject();
  try(ZipOutputStream out=new ZipOutputStream(new FileOutputStream(zip))){
   for(String n:new String[]{"index.html","game.js","core.js","style.css"}){byte[] bytes=("sample "+n).getBytes(StandardCharsets.UTF_8);StringBuilder h=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))h.append(String.format(Locale.ROOT,"%02x",b&255));files.put(n,h.toString());out.putNextEntry(new ZipEntry(n));out.write(corrupt&&n.equals("game.js")?new byte[]{1}:bytes);out.closeEntry();}
   if(extra!=null){out.putNextEntry(new ZipEntry(extra));out.write(1);out.closeEntry();}
   JSONObject manifest=new JSONObject().put("game","cockro").put("engine",engine).put("version","test").put("files",files);out.putNextEntry(new ZipEntry("patch.json"));out.write(manifest.toString().getBytes(StandardCharsets.UTF_8));out.closeEntry();
  }return zip;
 }
 @Test public void activatesVerifiedBundleAndResetPreservesSave()throws Exception{context.getSharedPreferences("saved-game",0).edit().putInt("level",42).commit();assertEquals("test",GamePatch.install(context,Uri.fromFile(bundle(false,88,null))));assertTrue(new File(GamePatch.active(context),"index.html").isFile());GamePatch.reset(context);assertNull(GamePatch.active(context));assertEquals(42,context.getSharedPreferences("saved-game",0).getInt("level",0));}
 @Test public void corruptionKeepsPreviousPatch()throws Exception{GamePatch.install(context,Uri.fromFile(bundle(false,88,null)));File previous=GamePatch.active(context);Thread.sleep(2);try{GamePatch.install(context,Uri.fromFile(bundle(true,88,null)));fail();}catch(IOException expected){}assertEquals(previous,GamePatch.active(context));assertTrue(previous.isDirectory());}
 @Test public void rejectsWrongEngine()throws Exception{try{GamePatch.install(context,Uri.fromFile(bundle(false,89,null)));fail();}catch(IOException expected){}assertNull(GamePatch.active(context));}
 @Test public void rejectsTraversal()throws Exception{try{GamePatch.install(context,Uri.fromFile(bundle(false,88,"../escaped.js")));fail();}catch(IOException expected){}assertFalse(new File(context.getFilesDir(),"escaped.js").exists());assertNull(GamePatch.active(context));}
 @Test public void rejectsUnlistedFiles()throws Exception{try{GamePatch.install(context,Uri.fromFile(bundle(false,88,"extra.js")));fail();}catch(IOException expected){}assertNull(GamePatch.active(context));}
}
