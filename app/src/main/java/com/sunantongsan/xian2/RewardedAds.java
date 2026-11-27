package com.sunantongsan.xian2;

import android.app.Activity;
import android.os.SystemClock;
import android.webkit.WebView;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.rewarded.*;
import com.google.android.ump.*;
import org.json.JSONObject;
import java.util.Collections;

/** Origin-scoped bridge. SDK callbacks never grant inventory; the server verifies SSV. */
final class RewardedAds {
 private final Activity activity;
 private final ConsentInformation consent;
 private WebView web;
 private boolean initialized,initializing,busy,dead;
 private AdView banner;
 private boolean rosterVisible, foreground;
 private int bannerInset;
 private long rosterRetryAt, fieldRetryAt;
 private final Runnable retryRoster = this::syncBanner;
 private final Runnable retryField = this::syncFieldBanner;
 private AdView fieldAd;
 private boolean fieldWanted,fieldLoaded;
 private double fieldViewport,fieldTop,fieldRight,fieldMaxWidth,fieldMaxHeight;
 private String failure="";
 private final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
 private int requestId;
 // Preloaded rewarded video so the player does not wait after pressing the button.
 private RewardedAd ready;private long readyAt;private boolean preloading;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 RewardedAds(Activity activity){this.activity=activity;consent=UserMessagingPlatform.getConsentInformation(activity);}
 private boolean canLoadAds(){return BuildConfig.TEST_ADS||consent.canRequestAds();}
 void start(){
  if(BuildConfig.TEST_ADS){initialize();return;}
  consent.requestConsentInfoUpdate(activity,new ConsentRequestParameters.Builder().build(),
   ()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->initialize()),error->initialize());
 }
 private void initialize(){
  if(dead||!canLoadAds()||initialized||initializing)return;
  initializing=true;MobileAds.initialize(activity,status->activity.runOnUiThread(()->{initializing=false;initialized=true;syncBanner();syncFieldBanner();preload();emit("status");}));
 }
 void attach(WebView view){web=view;if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;
  WebViewCompat.addWebMessageListener(view,"CockroAds",Collections.singleton(ORIGIN),(v,message,origin,mainFrame,reply)->{
   if(!mainFrame||!ORIGIN.equals(origin.toString())||dead)return;
   try{JSONObject data=new JSONObject(message.getData());String type=data.optString("type");
    if("fieldBanner".equals(type)){
     fieldWanted=data.optBoolean("visible");fieldViewport=data.optDouble("viewportWidth",0);fieldTop=data.optDouble("top",0);fieldRight=data.optDouble("right",0);fieldMaxWidth=data.optDouble("maxWidth",0);fieldMaxHeight=data.optDouble("maxHeight",0);syncFieldBanner();
    }
    else if("rosterBanner".equals(type)){rosterVisible=data.optBoolean("visible");syncBanner();}
    else if("status".equals(type))emit("status");
    else if("privacy".equals(type)&&!busy){UserMessagingPlatform.showPrivacyOptionsForm(activity,error->{initialize();emit("status");});}
    else if("show".equals(type))show(data.optString("nonce"),data.optString("user"));
   }catch(Exception ignored){emit("error");}
  });
 }
 // The roster gets a separate row outside the WebView, so an ad cannot cover its buttons.
 void setForeground(boolean value){foreground=value;syncBanner();syncFieldBanner();}
 private static long retryDelay(AdError error){
  return error.getCode()==AdRequest.ERROR_CODE_NETWORK_ERROR ? 15_000L : 60_000L;
 }
 private boolean waitingForRetry(Runnable retry,long next){
  handler.removeCallbacks(retry);
  long remaining=next-SystemClock.elapsedRealtime();
  if(remaining<=0)return false;
  handler.postDelayed(retry,remaining);
  return true;
 }
 private void syncBanner(){
  if(dead||!foreground||!rosterVisible||!initialized||!canLoadAds()||web==null){
   handler.removeCallbacks(retryRoster);clearBanner();return;
  }
  if(banner!=null||!(web.getParent() instanceof FrameLayout))return;
  FrameLayout host=(FrameLayout)web.getParent();
  int width=AdSize.BANNER.getWidthInPixels(activity);
  int height=AdSize.BANNER.getHeightInPixels(activity);
  int gap=Math.round(8*activity.getResources().getDisplayMetrics().density);
  if(host.getWidth()<width+2*gap||host.getHeight()<height*4)return;
  if(waitingForRetry(retryRoster,rosterRetryAt))return;
  AdView view=new AdView(activity);
  banner=view;view.setAdSize(AdSize.BANNER);view.setAdUnitId(BuildConfig.ADMOB_BANNER_UNIT_ID);
  FrameLayout.LayoutParams params=new FrameLayout.LayoutParams(width,height,Gravity.BOTTOM|Gravity.LEFT);
  params.leftMargin=gap;params.bottomMargin=gap;
  view.setVisibility(View.INVISIBLE);host.addView(view,params);
  view.setAdListener(new AdListener(){
   @Override public void onAdLoaded(){
    if(banner!=view)return;
    setBannerInset(height+2*gap);view.setVisibility(View.VISIBLE);
   }
   @Override public void onAdFailedToLoad(LoadAdError error){if(banner!=view)return;
    clearBanner();rosterRetryAt=SystemClock.elapsedRealtime()+retryDelay(error);syncBanner();}
  });
  view.loadAd(new AdRequest.Builder().build());
 }
 private void setBannerInset(int pixels){
  if(bannerInset==pixels||web==null)return;
  FrameLayout.LayoutParams layout=(FrameLayout.LayoutParams)web.getLayoutParams();
  layout.bottomMargin+=pixels-bannerInset;bannerInset=pixels;web.setLayoutParams(layout);
 }
 private void clearBanner(){
  if(banner==null)return;
  AdView old=banner;banner=null;
  if(old.getParent() instanceof FrameLayout)((FrameLayout)old.getParent()).removeView(old);
  old.destroy();setBannerInset(0);
 }
 // Gameplay banner: keep Google's creative at its SDK size; reserve space only after load.
 private void syncFieldBanner(){
  if(dead||web==null||!(web.getParent() instanceof FrameLayout))return;
  FrameLayout host=(FrameLayout)web.getParent();
  double scale=fieldViewport>0?web.getWidth()/fieldViewport:0;
  int width=AdSize.BANNER.getWidthInPixels(activity),height=AdSize.BANNER.getHeightInPixels(activity);
  boolean fits=Double.isFinite(scale)&&scale>0&&Double.isFinite(fieldTop)&&Double.isFinite(fieldRight)&&fieldTop>=0&&fieldRight>=0&&width<=fieldMaxWidth*scale&&height<=fieldMaxHeight*scale&&fieldRight*scale+width<=web.getWidth()&&fieldTop*scale+height<=web.getHeight();
  if(!foreground||!fieldWanted||rosterVisible||!initialized||!canLoadAds()||!fits){
   handler.removeCallbacks(retryField);
   if(fieldAd!=null)fieldAd.setVisibility(View.GONE);
   emitFieldBanner(false,0,0);return;
  }
  final int right=(int)Math.ceil(host.getWidth()-web.getRight()+fieldRight*scale);
  final int top=(int)Math.ceil(web.getTop()+fieldTop*scale);
  FrameLayout.LayoutParams params=new FrameLayout.LayoutParams(width,height,Gravity.TOP|Gravity.RIGHT);
  params.rightMargin=right;params.topMargin=top;
  if(fieldAd==null){
   if(waitingForRetry(retryField,fieldRetryAt))return;
   AdView view=new AdView(activity);fieldAd=view;fieldLoaded=false;
   view.setAdSize(AdSize.BANNER);view.setAdUnitId(BuildConfig.ADMOB_BANNER_UNIT_ID);
   view.setVisibility(View.INVISIBLE);host.addView(view,params);
   view.setAdListener(new AdListener(){
    @Override public void onAdLoaded(){if(dead||fieldAd!=view)return;fieldLoaded=true;syncFieldBanner();}
    @Override public void onAdFailedToLoad(LoadAdError error){if(fieldAd!=view)return;
     clearFieldBanner();fieldRetryAt=SystemClock.elapsedRealtime()+retryDelay(error);syncFieldBanner();}
   });
   view.loadAd(new AdRequest.Builder().build());
  }else{
   fieldAd.setLayoutParams(params);fieldAd.setVisibility(fieldLoaded?View.VISIBLE:View.INVISIBLE);
  }
  emitFieldBanner(fieldLoaded,width/scale,height/scale);
 }
 private void clearFieldBanner(){
  AdView old=fieldAd;fieldAd=null;fieldLoaded=false;
  if(old!=null){
   if(old.getParent() instanceof FrameLayout)((FrameLayout)old.getParent()).removeView(old);
   old.destroy();
  }
  emitFieldBanner(false,0,0);
 }
 private void emitFieldBanner(boolean loaded,double width,double height){
  if(dead||web==null)return;
  try{JSONObject event=new JSONObject();event.put("loaded",loaded);event.put("width",width);event.put("height",height);
   web.evaluateJavascript("window.dispatchEvent(new CustomEvent('cockro-field-banner',{detail:"+event.toString()+"}));",null);
  }catch(Exception ignored){}
 }
 private void fail(String stage,AdError error){failure=stage+" • "+error.getDomain()+" / "+error.getCode()+" • "+error.getMessage();emit("unavailable");}
 private void emit(String status){
  if(dead||web==null)return;
  try{JSONObject out=new JSONObject();out.put("status",status);out.put("diagnostic",failure);out.put("nativeVersion",BuildConfig.VERSION_NAME);out.put("nativeCode",BuildConfig.VERSION_CODE);out.put("ready",initialized&&canLoadAds()&&!busy);out.put("test",BuildConfig.TEST_ADS);out.put("privacy",consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
   String script="window.dispatchEvent(new CustomEvent('cockro-ad',{detail:"+out.toString()+"}));";
   web.evaluateJavascript(script,null);
  }catch(Exception ignored){}
 }
 private void preload(){
  if(dead||preloading||!initialized||!canLoadAds()||(ready!=null&&System.currentTimeMillis()-readyAt<50*60000L))return;
  ready=null;preloading=true;
  RewardedAd.load(activity,BuildConfig.ADMOB_REWARDED_UNIT_ID,new AdRequest.Builder().build(),new RewardedAdLoadCallback(){
   @Override public void onAdFailedToLoad(LoadAdError error){preloading=false;if(!dead)handler.postDelayed(RewardedAds.this::preload,60000);}
   @Override public void onAdLoaded(RewardedAd ad){preloading=false;if(dead)return;ready=ad;readyAt=System.currentTimeMillis();}
  });
 }
 private void present(RewardedAd ad,String nonce,String user){
  if(activity.isFinishing()||!activity.hasWindowFocus()){busy=false;failure="วิดีโอโหลดแล้ว แต่เกมไม่ได้อยู่ด้านหน้า กรุณาลองใหม่";emit("unavailable");return;}
  if(!BuildConfig.TEST_ADS)ad.setServerSideVerificationOptions(new ServerSideVerificationOptions.Builder().setUserId(user).setCustomData(nonce).build());
  ad.setFullScreenContentCallback(new FullScreenContentCallback(){
   @Override public void onAdDismissedFullScreenContent(){busy=false;emit("dismissed");preload();}
   @Override public void onAdFailedToShowFullScreenContent(AdError error){busy=false;fail("เปิดวิดีโอไม่สำเร็จ",error);preload();}
  });
  ad.show(activity,reward->emit(BuildConfig.TEST_ADS?"test-earned":"verifying"));
 }
 private void show(String nonce,String user){
  if(dead)return;
  if(busy||!initialized||!canLoadAds()||!activity.hasWindowFocus()){failure=busy?"มีคำขอโฆษณากำลังทำงาน":!activity.hasWindowFocus()?"กลับมาที่หน้าเกมแล้วลองใหม่":"ระบบโฆษณาหรือความยินยอมยังไม่พร้อม";emit("unavailable");return;}
  if(!BuildConfig.TEST_ADS&&(!nonce.matches("[a-f0-9]{48}")||!user.matches("[a-f0-9]{64}"))){emit("error");return;}
  failure="";busy=true;emit("loading");
  if(ready!=null&&System.currentTimeMillis()-readyAt<55*60000L){RewardedAd ad=ready;ready=null;present(ad,nonce,user);return;}
  ready=null;
  final int request=++requestId;
  final Runnable timeout=()->{if(dead||request!=requestId)return;requestId++;busy=false;failure="โหลดโฆษณาเกิน 45 วินาที กรุณาลองใหม่";emit("unavailable");};
  handler.postDelayed(timeout,45000);
  RewardedAd.load(activity,BuildConfig.ADMOB_REWARDED_UNIT_ID,new AdRequest.Builder().build(),new RewardedAdLoadCallback(){
   @Override public void onAdFailedToLoad(LoadAdError error){if(dead||request!=requestId)return;handler.removeCallbacks(timeout);busy=false;fail("โหลดโฆษณาไม่สำเร็จ",error);}
   @Override public void onAdLoaded(RewardedAd ad){
    if(dead||request!=requestId)return;handler.removeCallbacks(timeout);
    present(ad,nonce,user);
   }
  });
 }
 void destroy(){dead=true;ready=null;clearBanner();if(fieldAd!=null){if(fieldAd.getParent() instanceof FrameLayout)((FrameLayout)fieldAd.getParent()).removeView(fieldAd);fieldAd.destroy();fieldAd=null;}requestId++;handler.removeCallbacksAndMessages(null);web=null;}
}
