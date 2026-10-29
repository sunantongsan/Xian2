package com.sunantongsan.xian2;
import java.util.*;
import org.junit.*;

import org.json.JSONObject;



import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.zip.*;
import static org.junit.Assert.*;

public class PatchRecoveryTest {
 static class TestStore implements GamePatch.Store{
  final File root;final Map<String,String> values=new HashMap<>();boolean failCommit;String bundled="4.4.1";
  TestStore()throws Exception{root=java.nio.file.Files.createTempDirectory("patch-recovery").toFile();}
  public File files(){return root;}public String get(String key){return values.getOrDefault(key,"");}
  public String bundledVersion(){return bundled;}
  public boolean commit(Map<String,String> changes){if(failCommit)return false;for(Map.Entry<String,String> e:changes.entrySet())if(e.getValue()==null)values.remove(e.getKey());else values.put(e.getKey(),e.getValue());return true;}
 }
 TestStore context;
 @Before public void setup()throws Exception{context=new TestStore();}
 @After public void cleanup(){GamePatch.remove(context.root);}
 byte[] bundle(String version)throws Exception{
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();JSONObject files=new JSONObject();
  try(ZipOutputStream zip=new ZipOutputStream(bytes)){for(String name:new String[]{"index.html","game.js","core.js","style.css"}){byte[] data=("sample "+name).getBytes(StandardCharsets.UTF_8);files.put(name,AutoUpdater.hex(MessageDigest.getInstance("SHA-256").digest(data)));zip.putNextEntry(new ZipEntry(name));zip.write(data);zip.closeEntry();}zip.putNextEntry(new ZipEntry("patch.json"));zip.write(new JSONObject().put("game","cockro").put("engine",88).put("version",version).put("files",files).toString().getBytes(StandardCharsets.UTF_8));zip.closeEntry();}return bytes.toByteArray();
 }
 void install(String version)throws Exception{GamePatch.installStream(context,new ByteArrayInputStream(bundle(version)),version,null);}
 @Test public void nativeUpgradeUsesNewBundleWithoutDeletingSave()throws Exception{
  install("4.11.0");GamePatch.healthy(context);
  File save=new File(context.root,"player-save.json");java.nio.file.Files.write(save.toPath(),"keep-me".getBytes(StandardCharsets.UTF_8));
  context.bundled="4.12.0";assertNull(GamePatch.active(context));assertEquals("4.12.0",GamePatch.version(context));assertTrue(save.exists());
  install("4.12.1");GamePatch.healthy(context);assertEquals("4.12.1",GamePatch.version(context));assertTrue(save.exists());
 }
 @Test public void activationIsPendingUntilGameBoots()throws Exception{install("4.5.0");assertTrue(GamePatch.pending(context));GamePatch.healthy(context);assertFalse(GamePatch.pending(context));assertEquals("4.5.0",GamePatch.version(context));}
 @Test public void failedNextBootRestoresPreviousAndBlocksBadVersion()throws Exception{install("4.5.0");GamePatch.healthy(context);File good=GamePatch.active(context);install("4.5.1");assertTrue(GamePatch.recover(context));assertEquals(good,GamePatch.active(context));assertEquals("4.5.0",GamePatch.version(context));assertEquals("4.5.1",context.get("blockedVersion"));assertFalse(GamePatch.pending(context));}
 @Test public void rejectedBundleNeverChangesActiveVersion()throws Exception{install("4.5.0");GamePatch.healthy(context);File good=GamePatch.active(context);try{GamePatch.installStream(context,new ByteArrayInputStream(bundle("4.5.1")),"4.5.2",null);fail();}catch(IOException expected){}assertEquals(good,GamePatch.active(context));assertFalse(GamePatch.pending(context));}
 @Test public void firstFailedUpdateFallsBackToBundledAssetsWithoutDeletingSave()throws Exception{File save=new File(context.root,"player-save.json");java.nio.file.Files.write(save.toPath(),"{\"level\":42}".getBytes(StandardCharsets.UTF_8));install("4.5.1");assertTrue(GamePatch.recover(context));assertNull(GamePatch.active(context));assertEquals("{\"level\":42}",new String(java.nio.file.Files.readAllBytes(save.toPath()),StandardCharsets.UTF_8));}
 @Test public void keepsOnlyCurrentAndPreviousConfirmedVersions()throws Exception{install("4.5.0");GamePatch.healthy(context);File first=GamePatch.active(context);install("4.5.1");GamePatch.healthy(context);File second=GamePatch.active(context);install("4.5.2");GamePatch.healthy(context);assertFalse(first.exists());assertTrue(second.exists());assertTrue(GamePatch.active(context).exists());}
 @Test public void failedPointerCommitPreservesPreviousAndDeletesStaging()throws Exception{install("4.5.0");GamePatch.healthy(context);File good=GamePatch.active(context);context.failCommit=true;try{install("4.5.1");fail();}catch(IOException expected){}assertEquals(good,GamePatch.active(context));assertEquals(1,context.root.list().length);}
}
