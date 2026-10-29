package com.sunantongsan.xian2;
import org.junit.Test;
import static org.junit.Assert.*;
import static org.junit.Assume.*;
import java.io.*;
public class UpdateFeedLiveTest {
 @Test public void publicFeedDownloadsThroughNativeClientWithoutAuthentication()throws Exception{
  assumeTrue("1".equals(System.getenv("COCKRO_LIVE_UPDATE_TEST")));
  File cache=java.nio.file.Files.createTempDirectory("live-update").toFile(),content=new File(cache,"extracted");content.mkdir();
  try{AutoUpdater updater=new AutoUpdater();UpdateManifest manifest=updater.latest();
   // After a release push, wait (up to 10 minutes) until the Vercel production feed serves the version being released.
   String expect=System.getenv("COCKRO_EXPECT_VERSION");
   for(int i=0;expect!=null&&!expect.isEmpty()&&!expect.equals(manifest.version)&&i<40;i++){Thread.sleep(15000);manifest=new AutoUpdater().latest();}
   if(expect!=null&&!expect.isEmpty())assertEquals("production feed version",expect,manifest.version);
   System.out.println("LIVE FEED "+manifest.version+" size="+manifest.size+" sha256="+manifest.sha256+" path="+manifest.path);assertTrue(manifest.minApp<=91);File zip=updater.download(manifest,cache,(done,total)->{});assertEquals(manifest.size,zip.length());System.out.println("LIVE DOWNLOAD OK "+zip.length()+" bytes, SHA-256 verified");try(InputStream in=new FileInputStream(zip)){assertEquals(manifest.version,PatchArchive.extract(in,content));}assertTrue(new File(content,"game.js").isFile());assertTrue(new File(content,"heroes/cockro-combat-v2.webp").isFile());}
  finally{remove(cache);}
 }
 private static void remove(File file){if(file.isDirectory())for(File child:file.listFiles())remove(child);file.delete();}
}
