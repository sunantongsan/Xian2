package com.sunantongsan.xian2;

import android.app.Activity;
import android.webkit.WebView;
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
 private String failure="";
 private final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
 private int requestId;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 RewardedAds(Activity activity){this.activity=activity;consent=UserMessagingPlatform.getConsentInformation(activity);}
 void start(){
  consent.requestConsentInfoUpdate(activity,new ConsentRequestParameters.Builder().build(),
   ()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->initialize()),error->initialize());
 }
 private void initialize(){
  if(dead||!consent.canRequestAds()||initialized||initializing)return;
  initializing=true;MobileAds.initialize(activity,status->activity.runOnUiThread(()->{initializing=false;initialized=true;emit("status");}));
 }
 void attach(WebView view){web=view;if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;
  WebViewCompat.addWebMessageListener(view,"CockroAds",Collections.singleton(ORIGIN),(v,message,origin,mainFrame,reply)->{
   if(!mainFrame||!ORIGIN.equals(origin.toString())||dead)return;
   try{JSONObject data=new JSONObject(message.getData());String type=data.optString("type");
    if("status".equals(type))emit("status");
    else if("privacy".equals(type)&&!busy){UserMessagingPlatform.showPrivacyOptionsForm(activity,error->{initialize();emit("status");});}
    else if("show".equals(type))show(data.optString("nonce"),data.optString("user"));
   }catch(Exception ignored){emit("error");}
  });
 }
 private void fail(String stage,AdError error){failure=stage+" • "+error.getDomain()+" / "+error.getCode()+" • "+error.getMessage();emit("unavailable");}
 private void emit(String status){
  if(dead||web==null)return;
  try{JSONObject out=new JSONObject();out.put("status",status);out.put("diagnostic",failure);out.put("nativeVersion",BuildConfig.VERSION_NAME);out.put("nativeCode",BuildConfig.VERSION_CODE);out.put("ready",initialized&&consent.canRequestAds()&&!busy);out.put("test",BuildConfig.DEBUG);out.put("privacy",consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
   String script="window.dispatchEvent(new CustomEvent('cockro-ad',{detail:"+out.toString()+"}));";
   web.evaluateJavascript(script,null);
  }catch(Exception ignored){}
 }
 private void show(String nonce,String user){
  if(dead)return;
  if(busy||!initialized||!consent.canRequestAds()||!activity.hasWindowFocus()){failure=busy?"มีคำขอโฆษณากำลังทำงาน":!activity.hasWindowFocus()?"กลับมาที่หน้าเกมแล้วลองใหม่":"ระบบโฆษณาหรือความยินยอมยังไม่พร้อม";emit("unavailable");return;}
  if(!BuildConfig.DEBUG&&(!nonce.matches("[a-f0-9]{48}")||!user.matches("[a-f0-9]{64}"))){emit("error");return;}
  failure="";busy=true;emit("loading");
  final int request=++requestId;
  final Runnable timeout=()->{if(dead||request!=requestId)return;requestId++;busy=false;failure="โหลดโฆษณาเกิน 45 วินาที กรุณาลองใหม่";emit("unavailable");};
  handler.postDelayed(timeout,45000);
  RewardedAd.load(activity,BuildConfig.ADMOB_REWARDED_UNIT_ID,new AdRequest.Builder().build(),new RewardedAdLoadCallback(){
   @Override public void onAdFailedToLoad(LoadAdError error){if(dead||request!=requestId)return;handler.removeCallbacks(timeout);busy=false;fail("โหลดโฆษณาไม่สำเร็จ",error);}
   @Override public void onAdLoaded(RewardedAd ad){
    if(dead||request!=requestId)return;handler.removeCallbacks(timeout);
    if(activity.isFinishing()||!activity.hasWindowFocus()){busy=false;failure="วิดีโอโหลดแล้ว แต่เกมไม่ได้อยู่ด้านหน้า กรุณาลองใหม่";emit("unavailable");return;}
    if(!BuildConfig.DEBUG)ad.setServerSideVerificationOptions(new ServerSideVerificationOptions.Builder().setUserId(user).setCustomData(nonce).build());
    ad.setFullScreenContentCallback(new FullScreenContentCallback(){
     @Override public void onAdDismissedFullScreenContent(){busy=false;emit("dismissed");}
     @Override public void onAdFailedToShowFullScreenContent(AdError error){busy=false;fail("เปิดวิดีโอไม่สำเร็จ",error);}
    });
    ad.show(activity,reward->emit(BuildConfig.DEBUG?"test-earned":"verifying"));
   }
  });
 }
 void destroy(){dead=true;requestId++;handler.removeCallbacksAndMessages(null);web=null;}
}

