package com.sunantongsan.xian2;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
public class MainActivity extends Activity {
 private WebView web;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 @Override public void onCreate(Bundle b){super.onCreate(b);web=new WebView(this);setContentView(web);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse r=loader.shouldInterceptRequest(request.getUrl());return r!=null?r:new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(ORIGIN+"/assets/");}
  });web.loadUrl(ORIGIN+"/assets/index.html");
 }
 @Override protected void onPause(){web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));",null);web.onPause();web.pauseTimers();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
 @Override public void onBackPressed(){web.evaluateJavascript("(()=>{const d=document.getElementById('modal'); if(!d.open)document.getElementById('menuBtn').click();})()",null);}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
