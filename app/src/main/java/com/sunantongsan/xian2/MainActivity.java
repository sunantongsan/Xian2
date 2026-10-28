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
 private static final int PICK_PATCH=880;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final AutoUpdater updater=new AutoUpdater();
 private WebView web;private FrameLayout root;private LinearLayout loading;private TextView status;private ProgressBar progress;private boolean destroyed,gameLoaded,startedCheck;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);root=new FrameLayout(this);setContentView(root);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  loading=new LinearLayout(this);loading.setOrientation(LinearLayout.VERTICAL);loading.setGravity(Gravity.CENTER);loading.setPadding(40,24,40,24);loading.setBackgroundColor(0xff091b2b);
  TextView title=new TextView(this);title.setText("COCKRO");title.setTextColor(0xffffd58a);title.setTextSize(32);loading.addView(title);
  status=new TextView(this);status.setTextColor(0xffe2edf5);status.setTextSize(16);status.setPadding(0,16,0,16);status.setText("กำลังตรวจสอบแพตช์…");loading.addView(status);
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setIndeterminate(true);loading.addView(progress,new LinearLayout.LayoutParams(400,24));
  Button skip=new Button(this);skip.setText("เล่นรุ่นเดิม");skip.setOnClickListener(v->{skip.setEnabled(false);status.setText("กำลังเปิดรุ่นเดิม…");updater.cancel();});loading.addView(skip);root.addView(loading,new FrameLayout.LayoutParams(-1,-1));
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){if(web==null){updater.cancel();return;}web.evaluateJavascript("(()=>{const d=document.getElementById('modal');if(d&&d.open){const e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();}else document.getElementById('menuBtn')?.click();})()",null);}});
 }
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}if(!startedCheck){startedCheck=true;checkUpdate();}}
 private void checkUpdate(){worker.execute(()->{
  File archive=null;String message=null;
  try{
   if(GamePatch.recover(this))message="แพตช์ก่อนหน้าเปิดไม่สำเร็จ กลับไปใช้รุ่นเดิมแล้ว";
   UpdateManifest m=updater.latest();int nativeVersion=getPackageManager().getPackageInfo(getPackageName(),0).versionCode;
   if(m.minApp>nativeVersion)message="มีอัปเดตตัวแอป กรุณาอัปเดตจากแหล่งที่ติดตั้ง";
   else if(UpdateManifest.compare(m.version,GamePatch.version(this))>0&&!m.version.equals(GamePatch.blocked(this))){
    archive=updater.download(m,getCacheDir(),(done,total)->runOnUiThread(()->{if(destroyed)return;progress.setIndeterminate(false);progress.setProgress((int)(done*100/total));status.setText("ดาวน์โหลดแพตช์ "+m.version+" • "+(done*100/total)+"%");}));
    runOnUiThread(()->{if(!destroyed){progress.setIndeterminate(true);status.setText("กำลังตรวจสอบไฟล์แพตช์…");}});
    GamePatch.installDownloaded(this,archive,m.version,updater);message="อัปเดตเป็น "+m.version+" แล้ว";
   }
  }catch(Exception e){message="ตรวจอัปเดตไม่ได้หรือถูกยกเลิก เปิดเกมรุ่นเดิม";}
  finally{if(archive!=null)archive.delete();final String text=message;runOnUiThread(()->{if(destroyed)return;if(text!=null)Toast.makeText(this,text,Toast.LENGTH_LONG).show();loadGame();});}
 });}
 private void loadGame(){if(destroyed||gameLoaded)return;gameLoaded=true;for(int i=root.getChildCount()-1;i>=0;i--)if(root.getChildAt(i)!=loading)root.removeViewAt(i);web=new WebView(this);root.addView(web,0,new FrameLayout.LayoutParams(-1,-1));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  File active=GamePatch.active(this);WebViewAssetLoader.PathHandler files=active==null?new WebViewAssetLoader.AssetsPathHandler(this):new WebViewAssetLoader.InternalStoragePathHandler(this,active);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",files).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse response=loader.shouldInterceptRequest(request.getUrl());return response!=null?response:new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().startsWith(ORIGIN+"/assets/");}
   @Override public void onPageFinished(WebView view,String url){if(url.equals(ORIGIN+"/assets/index.html")){loading.setVisibility(View.GONE);checkBoot(0);}}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())failedBoot();}
   @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){boolean restored=GamePatch.pending(MainActivity.this)&&GamePatch.rollback(MainActivity.this);root.removeView(view);view.destroy();web=null;if(restored)recreate();else{loading.setVisibility(View.VISIBLE);status.setText("เกมหยุดทำงาน กรุณาปิดแล้วเปิดใหม่");progress.setVisibility(View.GONE);}return true;}
  });
  Button patch=new Button(this);patch.setText("แพตช์");FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(-2,-2,Gravity.TOP|Gravity.CENTER_HORIZONTAL);root.addView(patch,lp);patch.setOnClickListener(v->new android.app.AlertDialog.Builder(this).setTitle("แพตช์เกม • "+GamePatch.version(this)).setMessage("เกมตรวจแพตช์ให้อัตโนมัติทุกครั้งที่เปิด\nสามารถนำเข้า ZIP หรือกลับรุ่นในแอปได้").setPositiveButton("เลือกไฟล์",(d,w)->{android.content.Intent intent=new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT);intent.setType("application/zip");intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);startActivityForResult(intent,PICK_PATCH);}).setNeutralButton("กลับรุ่นใน APK",(d,w)->{GamePatch.reset(this);recreate();}).setNegativeButton("ปิด",null).show());
  web.loadUrl(ORIGIN+"/assets/index.html");
 }
 private void checkBoot(int attempt){if(destroyed||web==null)return;web.evaluateJavascript("Boolean(document.getElementById('loading')?.hidden && document.getElementById('choose'))",value->{if(destroyed)return;if("true".equals(value)){worker.execute(()->GamePatch.healthy(this));}else if(attempt<40){handler.postDelayed(()->checkBoot(attempt+1),500);}else failedBoot();});}
 private void failedBoot(){if(destroyed)return;if(GamePatch.pending(this)&&GamePatch.rollback(this)){Toast.makeText(this,"แพตช์เปิดไม่สำเร็จ กลับไปใช้รุ่นเดิม",Toast.LENGTH_LONG).show();recreate();}else{loading.setVisibility(View.VISIBLE);status.setText("เปิดเกมไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่");progress.setVisibility(View.GONE);}}
 @Override protected void onActivityResult(int request,int result,android.content.Intent data){super.onActivityResult(request,result,data);if(request!=PICK_PATCH||result!=RESULT_OK||data==null||data.getData()==null)return;
  loading.setVisibility(View.VISIBLE);status.setText("กำลังตรวจสอบแพตช์…");android.net.Uri uri=data.getData();worker.execute(()->{try{GamePatch.install(this,uri);runOnUiThread(()->{if(!destroyed){gameLoaded=false;if(web!=null){root.removeView(web);web.destroy();web=null;}loadGame();}});}catch(Exception e){runOnUiThread(()->{if(!destroyed){loading.setVisibility(View.GONE);Toast.makeText(this,"ติดตั้งแพตช์ไม่ได้: "+e.getMessage(),Toast.LENGTH_LONG).show();}});}});
 }
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));",null);web.onPause();web.pauseTimers();}super.onPause();}
 @Override protected void onDestroy(){destroyed=true;updater.cancel();handler.removeCallbacksAndMessages(null);worker.shutdownNow();if(web!=null){root.removeView(web);web.destroy();web=null;}super.onDestroy();}
}
