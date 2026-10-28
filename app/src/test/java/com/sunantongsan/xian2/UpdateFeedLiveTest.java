package com.sunantongsan.xian2;
import org.junit.Test;
import static org.junit.Assert.*;
import static org.junit.Assume.*;
import java.io.*;
public class UpdateFeedLiveTest {
 @Test public void publicFeedDownloadsThroughNativeClientWithoutAuthentication()throws Exception{
  assumeTrue("1".equals(System.getenv("COCKRO_LIVE_UPDATE_TEST")));
  File cache=java.nio.file.Files.createTempDirectory("live-update").toFile(),content=new File(cache,"extracted");content.mkdir();
  try{AutoUpdater updater=new AutoUpdater();UpdateManifest manifest=updater.latest();assertTrue(manifest.minApp<=91);File zip=updater.download(manifest,cache,(done,total)->{});assertEquals(manifest.size,zip.length());try(InputStream in=new FileInputStream(zip)){assertEquals(manifest.version,PatchArchive.extract(in,content));}assertTrue(new File(content,"game.js").isFile());assertTrue(new File(content,"heroes/cockro-combat-v2.webp").isFile());}
  finally{remove(cache);}
 }
 private static void remove(File file){if(file.isDirectory())for(File child:file.listFiles())remove(child);file.delete();}
}
