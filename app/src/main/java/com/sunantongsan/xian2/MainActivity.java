package com.sunantongsan.xian2;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
public class MainActivity extends ComponentActivity {
 private WebView web;
 private static final int PICK_PATCH=880;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 @Override public void onCreate(Bundle b){super.onCreate(b);web=new WebView(this);android.widget.FrameLayout root=new android.widget.FrameLayout(this);root.addView(web);android.widget.Button patch=new android.widget.Button(this);patch.setText("แพตช์");android.widget.FrameLayout.LayoutParams lp=new android.widget.FrameLayout.LayoutParams(-2,-2,android.view.Gravity.TOP|android.view.Gravity.CENTER_HORIZONTAL);root.addView(patch,lp);patch.setOnClickListener(v->new android.app.AlertDialog.Builder(this).setTitle("แพตช์เกม").setMessage("นำเข้า ZIP ที่ได้รับจากผู้พัฒนาเท่านั้น เซฟในเครื่องจะคงเดิม ต้องเปิดเกมใหม่หลังติดตั้ง").setPositiveButton("เลือกไฟล์",(d,w)->{android.content.Intent i=new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT);i.setType("application/zip");i.addCategory(android.content.Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK_PATCH);}).setNeutralButton("กลับรุ่นใน APK",(d,w)->{GamePatch.reset(this);recreate();}).setNegativeButton("ปิด",null).show());setContentView(root);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  java.io.File active=GamePatch.active(this);
  WebViewAssetLoader.PathHandler handler=active!=null&&active.isDirectory()?new WebViewAssetLoader.InternalStoragePathHandler(this,active):new WebViewAssetLoader.AssetsPathHandler(this);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",handler).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse r=loader.shouldInterceptRequest(request.getUrl());return r!=null?r:new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(ORIGIN+"/assets/");}
  });getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
   @Override public void handleOnBackPressed(){web.evaluateJavascript("(()=>{const d=document.getElementById('modal');if(d.open){const e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();}else document.getElementById('menuBtn').click();})()",null);}
  });web.loadUrl(ORIGIN+"/assets/index.html");
 }
 @Override protected void onActivityResult(int request,int result,android.content.Intent data){super.onActivityResult(request,result,data);if(request!=PICK_PATCH||result!=RESULT_OK||data==null||data.getData()==null)return;android.net.Uri uri=data.getData();android.app.ProgressDialog progress=android.app.ProgressDialog.show(this,"ตรวจแพตช์","กำลังตรวจสอบและติดตั้ง…",true,false);new Thread(()->{try{String version=GamePatch.install(this,uri);runOnUiThread(()->{progress.dismiss();if(!isFinishing()&&!isDestroyed())new android.app.AlertDialog.Builder(this).setMessage("ติดตั้งแพตช์ "+version+" แล้ว").setPositiveButton("เปิดเกมใหม่",(d,w)->recreate()).setCancelable(false).show();});}catch(Exception e){runOnUiThread(()->{progress.dismiss();if(!isFinishing()&&!isDestroyed())new android.app.AlertDialog.Builder(this).setMessage("ติดตั้งไม่ได้: "+e.getMessage()).setPositiveButton("ปิด",null).show();});}}).start();}
 @Override protected void onPause(){web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));",null);web.onPause();web.pauseTimers();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}

