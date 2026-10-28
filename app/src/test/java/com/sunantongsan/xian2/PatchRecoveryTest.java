package com.sunantongsan.xian2;
import android.content.Context;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.zip.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=28)
public class PatchRecoveryTest {
 Context context;
 @Before public void setup(){context=RuntimeEnvironment.getApplication();context.getSharedPreferences("patch",0).edit().clear().commit();}
 byte[] bundle(String version)throws Exception{
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();JSONObject files=new JSONObject();
  try(ZipOutputStream zip=new ZipOutputStream(bytes)){for(String name:new String[]{"index.html","game.js","core.js","style.css"}){byte[] data=("sample "+name).getBytes(StandardCharsets.UTF_8);files.put(name,AutoUpdater.hex(MessageDigest.getInstance("SHA-256").digest(data)));zip.putNextEntry(new ZipEntry(name));zip.write(data);zip.closeEntry();}zip.putNextEntry(new ZipEntry("patch.json"));zip.write(new JSONObject().put("game","cockro").put("engine",88).put("version",version).put("files",files).toString().getBytes(StandardCharsets.UTF_8));zip.closeEntry();}return bytes.toByteArray();
 }
 void install(String version)throws Exception{GamePatch.installStream(context,new ByteArrayInputStream(bundle(version)),version,null);}
 @Test public void activationIsPendingUntilGameBoots()throws Exception{install("4.5.0");assertTrue(GamePatch.pending(context));GamePatch.healthy(context);assertFalse(GamePatch.pending(context));assertEquals("4.5.0",GamePatch.version(context));}
 @Test public void failedNextBootRestoresPreviousAndBlocksBadVersion()throws Exception{install("4.5.0");GamePatch.healthy(context);File good=GamePatch.active(context);install("4.5.1");assertTrue(GamePatch.recover(context));assertEquals(good,GamePatch.active(context));assertEquals("4.5.0",GamePatch.version(context));assertEquals("4.5.1",GamePatch.blocked(context));assertFalse(GamePatch.pending(context));}
 @Test public void rejectedBundleNeverChangesActiveVersion()throws Exception{install("4.5.0");GamePatch.healthy(context);File good=GamePatch.active(context);try{GamePatch.installStream(context,new ByteArrayInputStream(bundle("4.5.1")),"4.5.2",null);fail();}catch(IOException expected){}assertEquals(good,GamePatch.active(context));assertFalse(GamePatch.pending(context));}
 @Test public void firstFailedUpdateFallsBackToBundledAssetsWithoutDeletingSave()throws Exception{context.getSharedPreferences("player-save",0).edit().putInt("level",42).commit();install("4.5.1");assertTrue(GamePatch.recover(context));assertNull(GamePatch.active(context));assertEquals(42,context.getSharedPreferences("player-save",0).getInt("level",0));}
 @Test public void keepsOnlyCurrentAndPreviousConfirmedVersions()throws Exception{install("4.5.0");GamePatch.healthy(context);File first=GamePatch.active(context);install("4.5.1");GamePatch.healthy(context);File second=GamePatch.active(context);install("4.5.2");GamePatch.healthy(context);assertFalse(first.exists());assertTrue(second.exists());assertTrue(GamePatch.active(context).exists());}
}
