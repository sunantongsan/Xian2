import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Compile the production checkUpdate method unchanged against deterministic
// boundary fakes. This exercises Java control flow, not an Android device/UI.
const source=fs.readFileSync(new URL('../app/src/main/java/com/sunantongsan/xian2/MainActivity.java',import.meta.url),'utf8');
const start=source.indexOf(' private void checkUpdate()');
const end=source.indexOf(' private void loadGame()',start);
assert(start>=0&&end>start);
const method=source.slice(start,end);
const harness=`import java.io.*;
import java.util.*;
class StartupHarness {
 boolean destroyed,gameLoaded,forceBundled;int loads;String openedVersion;
 final Handler handler=new Handler();final Worker worker=new Worker();
 final AutoUpdater updater=new AutoUpdater(this);final Progress progress=new Progress();final Status status=new Status();
 final File cache;StartupHarness(File cache){this.cache=cache;}
 File getCacheDir(){return cache;}File getFilesDir(){return cache;}String getPackageName(){return "test";}PackageManager getPackageManager(){return new PackageManager();}
 void runOnUiThread(Runnable task){task.run();}
 void loadGame(){if(destroyed||gameLoaded)return;gameLoaded=true;loads++;openedVersion=forceBundled?"bundle":GamePatch.version(this);}
 void openBundledGame(){if(destroyed)return;forceBundled=true;updater.cancel();loadGame();}
 ${method}
 static void require(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception {
  File cache=new File(args[0]);
  GamePatch.installed="4.34.0";GamePatch.installs=0;
  StartupHarness slow=new StartupHarness(cache);slow.checkUpdate();
  require(slow.loads==1,"successful update must open exactly once");
  require("4.35.0".equals(slow.openedVersion),"must open updated content, not bundle");
  require(GamePatch.installs==1,"install once after completion");
  require(cache.list().length==0,"completed archive cleaned");
  GamePatch.installed="4.34.0";GamePatch.installs=0;
  StartupHarness failed=new StartupHarness(cache);failed.updater.fail=true;failed.checkUpdate();
  require(failed.loads==1,"network failure must open game");
  require("4.34.0".equals(failed.openedVersion),"failure preserves installed patch");
  require(!failed.forceBundled&&GamePatch.installs==0,"failure must not install or force bundle");
  StartupHarness destroyed=new StartupHarness(cache);destroyed.destroyed=true;destroyed.updater.fail=true;destroyed.checkUpdate();
  require(destroyed.loads==0,"destroyed activity must not open game");
  System.out.println("PASS: slow download beyond 15 seconds, verified completion, error fallback, cleanup, destroyed activity");
 }
}
class Handler {long now;final List<Runnable> tasks=new ArrayList<>();void postDelayed(Runnable task,long delay){tasks.add(task);}void advance(long ms){now+=ms;for(Runnable task:new ArrayList<>(tasks))task.run();tasks.clear();}}
class Worker {void execute(Runnable task){task.run();}}
class Progress {void setIndeterminate(boolean value){}void setProgress(int value){}}
class Status {void setText(String text){}}
class PackageManager {PackageInfo getPackageInfo(String name,int flags){return new PackageInfo();}}
class PackageInfo {int versionCode=111;}
class Toast {static final int LENGTH_LONG=1;static Toast makeText(StartupHarness c,String text,int duration){return new Toast();}void show(){}}
class UpdateManifest {int minApp=91;String version="4.35.0";static int compare(String a,String b){return a.compareTo(b);}}
class AutoUpdater {
 interface Progress {void update(long done,long total);}
 final StartupHarness owner;boolean cancelled,fail;
 AutoUpdater(StartupHarness owner){this.owner=owner;}void cancel(){cancelled=true;}
 UpdateManifest latest(){return new UpdateManifest();}
 File download(UpdateManifest manifest,File cache,Progress progress)throws Exception {
  if(fail)throw new IOException("simulated read timeout");
  progress.update(70,100);owner.handler.advance(16000);
  StartupHarness.require(!cancelled,"15-second timer cancelled a healthy download at 70%");
  StartupHarness.require(!owner.gameLoaded,"game opened before download completed");
  progress.update(100,100);return File.createTempFile("cockro-update-",".zip",owner.cache);
 }
}
class GamePatch {
 static String installed;static int installs;
 static boolean recover(StartupHarness c){return false;}static String version(StartupHarness c){return installed;}
 static String blocked(StartupHarness c){return "";}
 static void installDownloaded(StartupHarness c,File archive,String version,AutoUpdater updater)throws Exception {
  if(updater.cancelled)throw new IOException("cancelled");installs++;installed=version;
 }
}`;

test('native startup waits for slow downloads and falls back only after actual failure',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cockro-startup-test-'));
 try {
  const file=path.join(dir,'StartupHarness.java');fs.writeFileSync(file,harness);fs.mkdirSync(path.join(dir,'cache'));
  const compiled=spawnSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',dir,file],{encoding:'utf8'});
  assert.equal(compiled.status,0,compiled.stderr||String(compiled.error));
  const run=spawnSync('java',['-cp',dir,'StartupHarness',path.join(dir,'cache')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||String(run.error));assert.match(run.stdout,/PASS:/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('manual skip remains available and updater retains bounded network waits',()=>{
 assert.match(source,/loading\.skip\.setOnClickListener\(v->openBundledGame\(\)\)/);
 const updater=fs.readFileSync(new URL('../app/src/main/java/com/sunantongsan/xian2/AutoUpdater.java',import.meta.url),'utf8');
 assert.match(updater,/setConnectTimeout\(5000\)/);assert.match(updater,/setReadTimeout\(8000\)/);
 assert.doesNotMatch(updater,/120_000_000_000L|System\.nanoTime\(\)>deadline/);
});

test('real downloader resumes interrupted transfers and verifies ranges, content, and slow networks',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cockro-download-test-'));
 try {
  // Replace only the system-clock boundary in the old/fixed source, so this
  // regression runs deterministically without sleeping for two real minutes.
  const updater=fs.readFileSync(new URL('../app/src/main/java/com/sunantongsan/xian2/AutoUpdater.java',import.meta.url),'utf8')
   .replace('package com.sunantongsan.xian2;','').replaceAll('System.nanoTime()','TestClock.nanoTime()');
  fs.writeFileSync(path.join(dir,'AutoUpdater.java'),updater);
  fs.writeFileSync(path.join(dir,'DownloadHarness.java'),`import java.io.*;
import java.net.*;
import java.security.*;
import java.util.*;
class TestClock {static long time;static long nanoTime(){return time;}}
class UpdateManifest {
 final byte[] expected;final String path="patch.zip",sha256;final long size;
 UpdateManifest(byte[] bytes)throws Exception {expected=bytes;size=bytes.length;sha256=AutoUpdater.hex(MessageDigest.getInstance("SHA-256").digest(bytes));}
 UpdateManifest(String unused)throws Exception {this(new byte[0]);}
}
class DownloadHarness {
 static void require(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 static class Response extends HttpURLConnection {
  final byte[] bytes;final boolean idle;boolean closed;int status=200;String range;
  Response(URL url,byte[] bytes,boolean idle){super(url);this.bytes=bytes;this.idle=idle;}
  public void connect(){}public void disconnect(){closed=true;}public boolean usingProxy(){return false;}
  public int getResponseCode(){return status;}public String getHeaderField(String name){return "Content-Range".equals(name)?range:null;}public long getContentLengthLong(){return bytes.length;}
  public InputStream getInputStream(){return new ByteArrayInputStream(bytes){
   public synchronized int read(byte[] b,int off,int len){
    TestClock.time+=5_000_000_000L;
    return super.read(b,off,Math.min(1,len));
   }
  };}
 }
 public static void main(String[] args)throws Exception {
  File cache=new File(args[0]);byte[] bytes=new byte[30];Arrays.fill(bytes,(byte)7);
  Response[] response=new Response[1];AutoUpdater updater=new AutoUpdater(url->response[0]=new Response(url,bytes,false));
  long[] progress={0};File result=updater.download(new UpdateManifest(bytes),cache,(done,total)->progress[0]=done);
  require(TestClock.time>120_000_000_000L,"simulated transfer must exceed old two-minute deadline");
  require(progress[0]==bytes.length,"all bytes reported");require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(result.toPath())),"download contents");result.delete();
  require(response[0].closed,"close connection");require(response[0].getReadTimeout()==8000,"inactivity timeout retained");require(response[0].getConnectTimeout()==5000,"connect timeout retained");
  AutoUpdater idle=new AutoUpdater(url->new Response(url,bytes,true){
   public InputStream getInputStream(){return new InputStream(){public int read()throws IOException{throw new SocketTimeoutException("simulated read inactivity");}};}
  });
  try{idle.download(new UpdateManifest(bytes),cache,(done,total)->{});throw new AssertionError("idle read must fail");}catch(SocketTimeoutException expected){}
  require(cache.list().length==1,"idle timeout retains resumable partial download");
  byte[] corrupt=bytes.clone();corrupt[0]=8;
  AutoUpdater bad=new AutoUpdater(url->new Response(url,corrupt,false));
  try{bad.download(new UpdateManifest(bytes),cache,(done,total)->{});throw new AssertionError("corrupt transfer must fail");}catch(IOException expected){}
  require(cache.list().length==0,"corruption removes download");
  UpdateManifest manifest=new UpdateManifest(bytes);
  File partial=new File(cache,"cockro-update-"+manifest.sha256+".part");
  AutoUpdater interrupted=new AutoUpdater(url->new Response(url,bytes,false){
   public InputStream getInputStream(){return new InputStream(){int sent;
    public int read()throws IOException{if(sent==10)throw new SocketTimeoutException("network lost");return bytes[sent++];}
    public int read(byte[] b,int off,int len)throws IOException{if(sent==10)throw new SocketTimeoutException("network lost");int n=Math.min(len,10-sent);System.arraycopy(bytes,sent,b,off,n);sent+=n;return n;}
   };}
  });
  try{interrupted.download(manifest,cache,(done,total)->{});throw new AssertionError("interruption must fail");}catch(SocketTimeoutException expected){}
  require(partial.length()==10,"interruption must preserve received bytes");
  AutoUpdater resumed=new AutoUpdater(url->{Response r=new Response(url,Arrays.copyOfRange(bytes,10,bytes.length),false);r.status=206;r.range="bytes 10-29/30";response[0]=r;return r;});
  File completed=resumed.download(manifest,cache,(done,total)->{});
  require("bytes=10-".equals(response[0].getRequestProperty("Range")),"resume requests only missing bytes");
  require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(completed.toPath())),"resumed file verifies as whole");
  AutoUpdater cached=new AutoUpdater(url->{throw new AssertionError("complete verified file should not redownload");});
  require(cached.download(manifest,cache,(done,total)->{}).equals(completed),"reuse complete verified download");
  java.nio.file.Files.write(partial.toPath(),Arrays.copyOf(bytes,10));
  AutoUpdater ignoredRange=new AutoUpdater(url->response[0]=new Response(url,bytes,false));
  completed=ignoredRange.download(manifest,cache,(done,total)->{});
  require("bytes=10-".equals(response[0].getRequestProperty("Range")),"range sent to non-supporting server");
  require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(completed.toPath())),"200 must replace, not append");
  java.nio.file.Files.write(partial.toPath(),Arrays.copyOf(bytes,10));
  AutoUpdater invalidRange=new AutoUpdater(url->{Response r=new Response(url,Arrays.copyOfRange(bytes,10,bytes.length),false);r.status=206;r.range="bytes 0-19/30";return r;});
  try{invalidRange.download(manifest,cache,(done,total)->{});throw new AssertionError("bad range must fail");}catch(IOException expected){}
  require(!partial.exists(),"bad range discards suspect partial");
  java.nio.file.Files.write(partial.toPath(),Arrays.copyOf(bytes,10));
  int[] requests={0};AutoUpdater unsatisfiable=new AutoUpdater(url->{Response r=new Response(url,bytes,false);if(requests[0]++==0)r.status=416;response[0]=r;return r;});
  completed=unsatisfiable.download(manifest,cache,(done,total)->{});
  require(requests[0]==2&&response[0].getRequestProperty("Range")==null,"416 retries once from zero");
  require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(completed.toPath())),"416 fallback verifies complete replacement");
  completed.delete();
  AutoUpdater truncated=new AutoUpdater(url->new Response(url,Arrays.copyOf(bytes,10),false){public long getContentLengthLong(){return -1;}});
  try{truncated.download(manifest,cache,(done,total)->{});throw new AssertionError("truncation must not return archive");}catch(EOFException expected){}
  require(partial.length()==10,"truncated body remains resumable");
  byte[] damagedPrefix=Arrays.copyOf(bytes,10);damagedPrefix[0]=99;java.nio.file.Files.write(partial.toPath(),damagedPrefix);
  try{resumed.download(manifest,cache,(done,total)->{});throw new AssertionError("corrupt prefix must fail full hash");}catch(IOException expected){}
  require(!partial.exists(),"corrupt combined download must be discarded");
  java.nio.file.Files.write(partial.toPath(),Arrays.copyOf(bytes,10));
  byte[] newer=bytes.clone();newer[0]=42;UpdateManifest changed=new UpdateManifest(newer);
  AutoUpdater newRelease=new AutoUpdater(url->response[0]=new Response(url,newer,false));
  File changedResult=newRelease.download(changed,cache,(done,total)->{});
  require(response[0].getRequestProperty("Range")==null,"changed content must start at zero");
  require(!partial.exists()&&cache.list().length==1,"obsolete partial removed");
  require(Arrays.equals(newer,java.nio.file.Files.readAllBytes(changedResult.toPath())),"new content separately verified");changedResult.delete();
  AutoUpdater[] cancel=new AutoUpdater[1];cancel[0]=new AutoUpdater(url->new Response(url,bytes,false));
  try{cancel[0].download(manifest,cache,(done,total)->{if(done==10)cancel[0].cancel();});throw new AssertionError("cancel must stop");}catch(IOException expected){}
  require(partial.length()==10,"manual cancellation retains resumable prefix");
  partial.delete();
  AutoUpdater encoded=new AutoUpdater(url->new Response(url,bytes,false){public String getContentEncoding(){return "gzip";}});
  try{encoded.download(manifest,cache,(done,total)->{});throw new AssertionError("encoded body must fail");}catch(IOException expected){}
  require(!partial.exists(),"encoded body must not persist");
  AutoUpdater wrongLength=new AutoUpdater(url->new Response(url,bytes,false){public long getContentLengthLong(){return 31;}});
  try{wrongLength.download(manifest,cache,(done,total)->{});throw new AssertionError("wrong length must fail");}catch(IOException expected){}
  require(!partial.exists(),"wrong length must not persist");
  AutoUpdater oversized=new AutoUpdater(url->new Response(url,new byte[31],false){public long getContentLengthLong(){return -1;}});
  try{oversized.download(manifest,cache,(done,total)->{});throw new AssertionError("oversized chunked body must fail");}catch(IOException expected){}
  require(!partial.exists(),"oversized body must be discarded");
  java.nio.file.Files.write(partial.toPath(),new byte[31]);
  completed=ignoredRange.download(manifest,cache,(done,total)->{});
  require(response[0].getRequestProperty("Range")==null,"oversized saved file must restart at zero");
  require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(completed.toPath())),"oversized saved file replaced");
  java.nio.file.Files.write(partial.toPath(),corrupt);
  completed=ignoredRange.download(manifest,cache,(done,total)->{});
  require(response[0].getRequestProperty("Range")==null,"complete corrupt file must restart at zero");
  require(Arrays.equals(bytes,java.nio.file.Files.readAllBytes(completed.toPath())),"complete corrupt file replaced");
  java.nio.file.Files.write(partial.toPath(),Arrays.copyOf(bytes,10));
  AutoUpdater offline=new AutoUpdater(url->{throw new ConnectException("offline");});
  try{offline.download(manifest,cache,(done,total)->{});throw new AssertionError("offline request must fail");}catch(ConnectException expected){}
  require(partial.length()==10,"connection failure preserves prior prefix");
  AutoUpdater serverError=new AutoUpdater(url->{Response r=new Response(url,bytes,false);r.status=503;response[0]=r;return r;});
  try{serverError.download(manifest,cache,(done,total)->{});throw new AssertionError("503 must fail");}catch(IOException expected){}
  require(partial.length()==10&&response[0].closed,"HTTP error preserves prefix and closes connection");
  AutoUpdater repeated416=new AutoUpdater(url->{Response r=new Response(url,bytes,false);r.status=416;return r;});
  try{repeated416.download(manifest,cache,(done,total)->{});throw new AssertionError("repeated 416 must fail");}catch(IOException expected){}
  require(!partial.exists(),"416 retry cannot leave suspect prefix");
  System.out.println("PASS: slow download, inactivity, interruption/resume, cached complete, Range ignored, invalid Range, corrupt prefix, changed content, cancellation, encoding, lengths, oversized bodies/cache, corrupt cache, offline, HTTP errors, repeated 416");

 }
}`);
  fs.mkdirSync(path.join(dir,'cache'));
  const compiled=spawnSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',dir,path.join(dir,'AutoUpdater.java'),path.join(dir,'DownloadHarness.java')],{encoding:'utf8'});
  assert.equal(compiled.status,0,compiled.stderr||String(compiled.error));
  const run=spawnSync('java',['-cp',dir,'DownloadHarness',path.join(dir,'cache')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||String(run.error));assert.match(run.stdout,/PASS:/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
