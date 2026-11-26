package com.sunantongsan.xian2;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Gravity;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
public class MainActivity extends ComponentActivity {
 private InviteLinks invites;
 private static final int PICK_PATCH=880;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private AutoUpdater updater=new AutoUpdater();
 private boolean updating;
 private GoldBilling billing;private RewardedAds ads;private GoogleLogin googleLogin;
 private WebView web;private FrameLayout root;private StartupScreen loading;private TextView status;private ProgressBar progress;private boolean destroyed,gameLoaded,startedCheck,foreground,forceBundled;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);root=new FrameLayout(this);setContentView(root);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  invites=new InviteLinks(this,()->runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('cockro-invite'))",null);}));
  invites.receive(getIntent());invites.readInstall();
  billing=new GoldBilling(this);googleLogin=new GoogleLogin(this);googleLogin.callback(getIntent());ads=new RewardedAds(this);ads.start();
  loading=new StartupScreen(this);status=loading.status;progress=loading.progress;
  loading.resume.setOnClickListener(v->{if(updating){loading.resume.setEnabled(false);status.setText(NativeLanguage.text(MainActivity.this,"กำลังพัก เก็บไฟล์ที่โหลดไว้…","Pausing and saving download progress…"));updater.cancel();}else checkUpdate();});
  loading.skip.setOnClickListener(v->openBundledGame());root.addView(loading,new FrameLayout.LayoutParams(-1,-1));
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){if(web==null){openBundledGame();return;}web.evaluateJavascript("(()=>{const d=document.getElementById('modal');if(d&&d.open){const e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();}else document.getElementById('menuBtn')?.click();})()",null);}});
 }
 @Override protected void onResume(){super.onResume();foreground=true;if(ads!=null)ads.setForeground(true);if(web!=null){web.onResume();if(googleLogin!=null)handler.postDelayed(()->googleLogin.resume(),400);}if(!startedCheck){startedCheck=true;checkUpdate();}}
 private void openBundledGame(){if(destroyed)return;forceBundled=false;updater.cancel();loading.skip.setEnabled(true);status.setText(NativeLanguage.text(MainActivity.this,"กำลังเปิดเกม…","Opening game…"));if(web!=null){root.removeView(web);web.destroy();web=null;}gameLoaded=false;loadGame();}
 private void checkUpdate(){
  if(destroyed||gameLoaded||updating)return;updating=true;updater=new AutoUpdater();loading.resume.setEnabled(true);loading.resume.setText(NativeLanguage.text(MainActivity.this,"พักดาวน์โหลด","Pause download"));progress.setVisibility(View.VISIBLE);progress.setIndeterminate(true);status.setText(NativeLanguage.text(MainActivity.this,"กำลังตรวจสอบอัปเดต…","Checking for updates…"));
  worker.execute(()->{
   File archive=null;String message=null;boolean ready=false,installed=false;
   try{
    if(GamePatch.recover(this))message=NativeLanguage.text(MainActivity.this,"กลับไปใช้รุ่นก่อนหน้าแล้ว","Restored the previous version");
    UpdateManifest m=updater.latest();int nativeVersion=getPackageManager().getPackageInfo(getPackageName(),0).versionCode;
    if(m.minApp>nativeVersion)throw new IOException(NativeLanguage.text(MainActivity.this,"กรุณาอัปเดตตัวแอปจาก Google Play","Please update the app from Google Play"));
    if(UpdateManifest.compare(m.version,GamePatch.version(this))>0&&!m.version.equals(GamePatch.blocked(this))){
     File reuse=GamePatch.active(this);
     archive=SparseUpdater.download(updater,m,new File(getFilesDir(),"patch-downloads"),name->reuse==null?getAssets().open(name):new FileInputStream(new File(reuse,name)),(done,total)->runOnUiThread(()->{if(destroyed||gameLoaded)return;progress.setIndeterminate(false);progress.setProgress((int)(done*100/total));status.setText(NativeLanguage.text(MainActivity.this,"ดาวน์โหลด ","Downloading ")+m.version+" • "+(done*100/total)+"% • "+String.format(java.util.Locale.ROOT,"%.1f / %.1f MB",done/1048576.0,total/1048576.0));}));
     runOnUiThread(()->{if(!destroyed&&!gameLoaded){progress.setIndeterminate(true);status.setText(NativeLanguage.text(MainActivity.this,"กำลังตรวจสอบและติดตั้ง…","Verifying and installing…"));}});
     GamePatch.installDownloaded(this,archive,m.version,updater);installed=true;message=NativeLanguage.text(MainActivity.this,"อัปเดตเป็น ","Updated to ")+m.version+NativeLanguage.text(MainActivity.this," แล้ว","");
    }
    ready=true;
   }catch(Exception e){message=(e.getMessage()==null?NativeLanguage.text(MainActivity.this,"การเชื่อมต่อขัดข้อง","Connection error"):e.getMessage())+NativeLanguage.text(MainActivity.this," • กดโหลดต่อ / ลองใหม่"," • Tap Resume / Retry");}
   finally{
    if(installed&&archive!=null)archive.delete();final String text=message;final boolean complete=ready;
    runOnUiThread(()->{updating=false;if(destroyed||gameLoaded)return;if(complete){if(text!=null)Toast.makeText(this,text,Toast.LENGTH_LONG).show();loadGame();}else{progress.setIndeterminate(false);status.setText(text);loading.resume.setText(NativeLanguage.text(MainActivity.this,"โหลดต่อ / ลองใหม่","Resume / Retry"));loading.resume.setEnabled(true);}});
   }
  });
 }
 private void loadGame(){if(destroyed||gameLoaded)return;gameLoaded=true;for(int i=root.getChildCount()-1;i>=0;i--)if(root.getChildAt(i)!=loading)root.removeViewAt(i);web=new WebView(this);root.addView(web,0,new FrameLayout.LayoutParams(-1,-1));
  // Clear only resource cache, preserving localStorage and online account tokens.
  web.clearCache(true);
  WebSettings settings=web.getSettings();settings.setCacheMode(WebSettings.LOAD_NO_CACHE);settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  File active=forceBundled?null:GamePatch.active(this);WebViewAssetLoader.PathHandler files=active==null?new WebViewAssetLoader.AssetsPathHandler(this):new WebViewAssetLoader.InternalStoragePathHandler(this,active);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",files).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse response=loader.shouldInterceptRequest(request.getUrl());if(response!=null){java.util.Map<String,String> headers=new java.util.HashMap<>();if(response.getResponseHeaders()!=null)headers.putAll(response.getResponseHeaders());headers.put("Cache-Control","no-store");response.setResponseHeaders(headers);return response;}return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(url.startsWith(ORIGIN+"/assets/"))return false;if(request.isForMainFrame()&&request.hasGesture()&&url.equals("https://cockro-network-privacy-policy.vercel.app/")){try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,request.getUrl()));}catch(android.content.ActivityNotFoundException e){Toast.makeText(MainActivity.this,NativeLanguage.text(MainActivity.this,"ไม่พบเบราว์เซอร์สำหรับเปิดนโยบาย","No browser is available to open the policy"),Toast.LENGTH_LONG).show();}}return true;}
   @Override public void onPageFinished(WebView view,String url){if(url.equals(ORIGIN+"/assets/index.html")){loading.setVisibility(View.GONE);checkBoot(0);}}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())failedBoot();}
   @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){boolean restored=!forceBundled&&GamePatch.pending(MainActivity.this)&&GamePatch.rollback(MainActivity.this);root.removeView(view);view.destroy();web=null;if(restored)recreate();else{loading.setVisibility(View.VISIBLE);status.setText(NativeLanguage.text(MainActivity.this,"เกมหยุดทำงาน กรุณาปิดแล้วเปิดใหม่","The game stopped. Please close and reopen it."));progress.setVisibility(View.GONE);}return true;}
  });
  web.addJavascriptInterface(invites,"CockroInvite");web.addJavascriptInterface(new NativeLanguage(this),"CockroLanguage");ads.attach(web);googleLogin.attach(web);billing.attach(web);
  web.loadUrl(ORIGIN+"/assets/index.html");if(!foreground){web.onPause();}
 }
 private void checkBoot(int attempt){if(destroyed||web==null)return;if(!foreground){handler.postDelayed(()->checkBoot(attempt),500);return;}web.evaluateJavascript("Boolean(window.cockroBootReady || (document.getElementById('loading')?.hidden && (document.getElementById('choose') || document.getElementById('googleLogin'))))",value->{if(destroyed)return;if("true".equals(value)){if(!forceBundled)worker.execute(()->GamePatch.healthy(this));}else if(attempt<40){handler.postDelayed(()->checkBoot(attempt+1),500);}else failedBoot();});}
 private void failedBoot(){if(destroyed)return;if(!forceBundled&&GamePatch.pending(this)&&GamePatch.rollback(this)){Toast.makeText(this,NativeLanguage.text(MainActivity.this,"แพตช์เปิดไม่สำเร็จ กลับไปใช้รุ่นเดิม","The update could not start. Restored the previous version."),Toast.LENGTH_LONG).show();recreate();}else{loading.setVisibility(View.VISIBLE);status.setText(NativeLanguage.text(MainActivity.this,"เปิดเกมไม่สำเร็จ กดปุ่มด้านล่างเพื่อลองรุ่นที่ติดตั้งอยู่","Could not start the game. Use the button below to try the installed version."));loading.skip.setEnabled(true);progress.setVisibility(View.GONE);}}
 @Override protected void onActivityResult(int request,int result,android.content.Intent data){super.onActivityResult(request,result,data);if(request!=PICK_PATCH||result!=RESULT_OK||data==null||data.getData()==null)return;
  loading.setVisibility(View.VISIBLE);status.setText(NativeLanguage.text(MainActivity.this,"กำลังตรวจสอบแพตช์…","Checking game updates…"));android.net.Uri uri=data.getData();worker.execute(()->{try{GamePatch.install(this,uri);runOnUiThread(()->{if(!destroyed){gameLoaded=false;if(web!=null){root.removeView(web);web.destroy();web=null;}loadGame();}});}catch(Exception e){runOnUiThread(()->{if(!destroyed){loading.setVisibility(View.GONE);Toast.makeText(this,NativeLanguage.text(MainActivity.this,"ติดตั้งแพตช์ไม่ได้: ","Could not install update: ")+e.getMessage(),Toast.LENGTH_LONG).show();}});}});
 }
 @Override protected void onNewIntent(android.content.Intent intent){super.onNewIntent(intent);setIntent(intent);if(invites!=null)invites.receive(intent);if(googleLogin!=null)googleLogin.callback(intent);}
 @Override protected void onPause(){foreground=false;if(ads!=null)ads.setForeground(false);if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));",null);web.onPause();}super.onPause();}
 @Override protected void onDestroy(){destroyed=true;if(invites!=null)invites.close();if(billing!=null)billing.destroy();if(ads!=null)ads.destroy();updater.cancel();handler.removeCallbacksAndMessages(null);worker.shutdownNow();if(web!=null){root.removeView(web);web.destroy();web=null;}super.onDestroy();}
}
