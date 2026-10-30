package com.sunantongsan.xian2;
import org.junit.*;
import org.junit.runner.RunWith;



import android.content.Context;
import android.net.Uri;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import static org.junit.Assert.*;

public class GamePatchTest {
 File root;
 @Before public void before()throws Exception{root=java.nio.file.Files.createTempDirectory("patch-test").toFile();}
 String extract(File zip)throws Exception{File target=new File(root,"extract-"+UUID.randomUUID());target.mkdir();return PatchArchive.extract(new FileInputStream(zip),target);}
 File bundle(boolean corrupt,int engine,String extra)throws Exception{
  File zip=File.createTempFile("patch-test", ".zip",root);JSONObject files=new JSONObject();
  try(ZipOutputStream out=new ZipOutputStream(new FileOutputStream(zip))){
   for(String n:new String[]{"index.html","game.js","core.js","style.css"}){byte[] bytes=("sample "+n).getBytes(StandardCharsets.UTF_8);StringBuilder h=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))h.append(String.format(Locale.ROOT,"%02x",b&255));files.put(n,h.toString());out.putNextEntry(new ZipEntry(n));out.write(corrupt&&n.equals("game.js")?new byte[]{1}:bytes);out.closeEntry();}
   if(extra!=null){out.putNextEntry(new ZipEntry(extra));out.write(1);out.closeEntry();}
   JSONObject manifest=new JSONObject().put("game","cockro").put("engine",engine).put("version","test").put("files",files);out.putNextEntry(new ZipEntry("patch.json"));out.write(manifest.toString().getBytes(StandardCharsets.UTF_8));out.closeEntry();
  }return zip;
 }
 @Test public void acceptsCompleteBundle()throws Exception{assertEquals("test",extract(bundle(false,88,null)));}
 @Test public void rejectsCorruption()throws Exception{try{extract(bundle(true,88,null));fail();}catch(IOException expected){assertTrue(expected.getMessage().contains("game.js"));}}
 @Test public void rejectsWrongEngine()throws Exception{try{extract(bundle(false,89,null));fail();}catch(IOException expected){}}
 @Test public void rejectsTraversal()throws Exception{try{extract(bundle(false,88,"../escaped.js"));fail();}catch(IOException expected){}assertFalse(new File(root,"escaped.js").exists());}
 @Test public void rejectsUnlistedFiles()throws Exception{try{extract(bundle(false,88,"extra.js"));fail();}catch(IOException expected){}}
}

