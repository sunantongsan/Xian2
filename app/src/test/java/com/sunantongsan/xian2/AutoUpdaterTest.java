package com.sunantongsan.xian2;
import org.junit.*;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static org.junit.Assert.*;
public class AutoUpdaterTest {
 File cache;
 @Before public void setup()throws Exception{cache=java.nio.file.Files.createTempDirectory("updates").toFile();}
 @After public void cleanup(){for(File f:cache.listFiles())f.delete();cache.delete();}
 static String manifest(byte[] bytes)throws Exception{return new JSONObject().put("game","cockro").put("engine",88).put("version","4.5.1").put("minAppVersionCode",91).put("size",bytes.length).put("sha256",AutoUpdater.hex(MessageDigest.getInstance("SHA-256").digest(bytes))).put("path","patches/"+AutoUpdater.hex(MessageDigest.getInstance("SHA-256").digest(bytes))+".zip").toString();}
 static class Response extends HttpURLConnection{
  byte[] data;int status;long length;boolean closed;
  Response(URL u,byte[] data,int status,long length){super(u);this.data=data;this.status=status;this.length=length;}
  public void connect(){}public void disconnect(){closed=true;}public boolean usingProxy(){return false;}
  public int getResponseCode(){return status;}public InputStream getInputStream(){return new ByteArrayInputStream(data);}public long getContentLengthLong(){return length;}
 }
 @Test public void verifiesDownloadedBytesAndSize()throws Exception{byte[] bytes="valid archive bytes".getBytes(StandardCharsets.UTF_8);UpdateManifest m=new UpdateManifest(manifest(bytes));Response[] response=new Response[1];AutoUpdater u=new AutoUpdater(url->response[0]=new Response(url,bytes,200,bytes.length));long[] progress={0};File f=u.download(m,cache,(done,total)->progress[0]=done);assertArrayEquals(bytes,java.nio.file.Files.readAllBytes(f.toPath()));assertEquals(bytes.length,progress[0]);assertTrue(response[0].closed);assertFalse(response[0].getInstanceFollowRedirects());}
 @Test public void rejectsCorruptionAndRemovesPartialFile()throws Exception{byte[] bytes={1,2,3};AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{1,2,4},200,3));try{u.download(new UpdateManifest(manifest(bytes)),cache,(a,b)->{});fail();}catch(IOException expected){}assertEquals(0,cache.list().length);}
 @Test public void keepsTruncatedDownloadWithoutLengthHeader()throws Exception{AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{1},200,-1));try{u.download(new UpdateManifest(manifest(new byte[]{1,2,3})),cache,(a,b)->{});fail();}catch(IOException expected){}assertEquals(1,cache.list().length);assertEquals(1,cache.listFiles()[0].length());}
 @Test public void cancellationDoesNotActivateOrKeepDownload()throws Exception{AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{1,2,3},200,3));u.cancel();try{u.download(new UpdateManifest(manifest(new byte[]{1,2,3})),cache,(a,b)->{});fail();}catch(IOException expected){}assertEquals(0,cache.list().length);}
 @Test public void rejectsRedirectAndServerFailure()throws Exception{for(int code:new int[]{302,401,500}){AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{1},code,1));try{u.latest();fail();}catch(IOException expected){}}}
 @Test public void boundsManifestAndPreventsForeignDownloadUrl()throws Exception{AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[32769],200,32769));try{u.latest();fail();}catch(IOException expected){}JSONObject m=new JSONObject(manifest(new byte[]{1}));m.put("path","https://untrusted.example/update.zip");try{new UpdateManifest(m.toString());fail();}catch(IOException expected){}}
 @Test public void comparesNumericVersionsAndRejectsDowngrades()throws Exception{assertTrue(UpdateManifest.compare("4.10.0","4.9.9")>0);assertEquals(0,UpdateManifest.compare("4.5.1","4.5.1"));assertTrue(UpdateManifest.compare("4.5.0","4.5.1")<0);try{UpdateManifest.compare("4.5.1-preview","4.5.1");fail();}catch(IOException expected){}}
 @Test public void rejectsWrongGameEngineAndOversizedBundle()throws Exception{for(String field:new String[]{"game","engine","size"}){JSONObject m=new JSONObject(manifest(new byte[]{1}));m.put(field,field.equals("game")?"another":field.equals("engine")?99:UpdateManifest.MAX_BYTES+1);try{new UpdateManifest(m.toString());fail();}catch(IOException expected){}}}
 @Test public void cancellationReturnsBeforeBlockedNetworkDisconnect()throws Exception{
  java.util.concurrent.CountDownLatch entered=new java.util.concurrent.CountDownLatch(1),release=new java.util.concurrent.CountDownLatch(1);
  AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{1},200,1){
   public int getResponseCode(){entered.countDown();try{release.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}return 200;}
   public void disconnect(){try{release.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}}
  });
  Thread download=new Thread(()->{try{u.latest();}catch(Exception expected){}});download.start();assertTrue(entered.await(2,java.util.concurrent.TimeUnit.SECONDS));
  try{java.util.concurrent.CountDownLatch returned=new java.util.concurrent.CountDownLatch(1);Thread click=new Thread(()->{u.cancel();returned.countDown();});click.start();assertTrue("Cancel must not block UI on network teardown",returned.await(500,java.util.concurrent.TimeUnit.MILLISECONDS));try{u.checkCancelled();fail();}catch(IOException expected){}}
  finally{release.countDown();download.join(2000);}
 }

 @Test public void resumesPartialAcrossNewUpdaterAndChecksRange()throws Exception{
  byte[] bytes={1,2,3,4,5,6};UpdateManifest m=new UpdateManifest(manifest(bytes));
  File part=new File(cache,"cockro-update-"+m.sha256+".part");java.nio.file.Files.write(part.toPath(),new byte[]{1,2,3});
  Response[] seen=new Response[1];AutoUpdater u=new AutoUpdater(url->seen[0]=new Response(url,new byte[]{4,5,6},206,3){public String getHeaderField(String key){return "Content-Range".equals(key)?"bytes 3-5/6":null;}});
  File result=u.download(m,cache,(a,b)->{});assertEquals("bytes=3-",seen[0].getRequestProperty("Range"));assertArrayEquals(bytes,java.nio.file.Files.readAllBytes(result.toPath()));
 }
 @Test public void fullResponseToRangeRestartsInsteadOfAppending()throws Exception{
  byte[] bytes={1,2,3,4};UpdateManifest m=new UpdateManifest(manifest(bytes));File part=new File(cache,"cockro-update-"+m.sha256+".part");java.nio.file.Files.write(part.toPath(),new byte[]{1,2});
  AutoUpdater u=new AutoUpdater(url->new Response(url,bytes,200,4));assertArrayEquals(bytes,java.nio.file.Files.readAllBytes(u.download(m,cache,(a,b)->{}).toPath()));
 }
 @Test public void cancellationKeepsBytesAndAnotherAttemptFinishesWithoutNetwork()throws Exception{
  byte[] bytes={1,2,3};UpdateManifest m=new UpdateManifest(manifest(bytes));AutoUpdater u=new AutoUpdater(url->new Response(url,bytes,200,3));
  try{u.download(m,cache,(done,total)->{if(done>0)u.cancel();});fail();}catch(IOException expected){}
  assertEquals(3,cache.listFiles()[0].length());AutoUpdater next=new AutoUpdater(url->{throw new AssertionError("complete file must be reused");});assertArrayEquals(bytes,java.nio.file.Files.readAllBytes(next.download(m,cache,(a,b)->{}).toPath()));
 }
 @Test public void wrongContentRangeCannotOverwritePartial()throws Exception{
  byte[] bytes={1,2,3};UpdateManifest m=new UpdateManifest(manifest(bytes));File part=new File(cache,"cockro-update-"+m.sha256+".part");java.nio.file.Files.write(part.toPath(),new byte[]{1});
  AutoUpdater u=new AutoUpdater(url->new Response(url,new byte[]{2,3},206,2){public String getHeaderField(String key){return "bytes 0-1/3";}});
  try{u.download(m,cache,(a,b)->{});fail();}catch(IOException expected){}assertArrayEquals(new byte[]{1},java.nio.file.Files.readAllBytes(part.toPath()));
 }
}



