package com.sunantongsan.xian2;
import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.android.billingclient.api.*;
import org.json.*;
import java.util.*;

/** Google Play owns checkout; only the authenticated game server grants gold. */
public final class GoldBilling implements PurchasesUpdatedListener {
 private final Activity activity;private final BillingClient client;private WebView web;
 private static final List<String> IDS=Arrays.asList("cockro_gold_5000","cockro_gold_20000","cockro_gold_150000","cockro_gold_500000");
 public GoldBilling(Activity a){activity=a;client=BillingClient.newBuilder(a).setListener(this).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();}
 public void attach(WebView w){web=w;w.addJavascriptInterface(this,"CockroBilling");}
 private void emit(JSONObject data){activity.runOnUiThread(()->{if(web!=null&&"https://appassets.androidplatform.net/assets/index.html".equals(web.getUrl()))web.evaluateJavascript("window.dispatchEvent(new CustomEvent('cockro-billing',{detail:"+data.toString()+"}));",null);});}
 private JSONObject event(String kind){JSONObject d=new JSONObject();try{d.put("kind",kind);}catch(JSONException ignored){}return d;}
 private void status(String message){JSONObject d=event("status");try{d.put("message",message);}catch(JSONException ignored){}emit(d);}
 private void ready(Runnable task){if(client.isReady()){task.run();return;}client.startConnection(new BillingClientStateListener(){public void onBillingSetupFinished(BillingResult r){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)task.run();else status(NativeLanguage.text(activity,"เชื่อมต่อ Google Play ไม่สำเร็จ กรุณาลองใหม่","Could not connect to Google Play. Please retry."));}public void onBillingServiceDisconnected(){status(NativeLanguage.text(activity,"Google Play ขาดการเชื่อมต่อ กรุณาลองใหม่","Google Play disconnected. Please retry."));}});}
 @JavascriptInterface public void refresh(){activity.runOnUiThread(()->ready(()->{catalog();restore();}));}
 private void catalog(){List<QueryProductDetailsParams.Product> list=new ArrayList<>();for(String id:IDS)list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(r,result)->{JSONObject d=event("products");JSONArray products=new JSONArray();if(r.getResponseCode()==0)for(ProductDetails p:result.getProductDetailsList()){ProductDetails.OneTimePurchaseOfferDetails offer=p.getOneTimePurchaseOfferDetails();if(offer==null)continue;try{products.put(new JSONObject().put("id",p.getProductId()).put("price",offer.getFormattedPrice()));}catch(JSONException ignored){}}try{d.put("products",products);}catch(JSONException ignored){}emit(d);});}
 @JavascriptInterface public void buy(String id,String owner,String profile){if(!IDS.contains(id)||!owner.matches("[a-f0-9]{64}")||!profile.matches("[a-f0-9]{64}"))return;activity.runOnUiThread(()->ready(()->{
 QueryProductDetailsParams.Product item=QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build();
 client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(),(r,result)->{
 if(r.getResponseCode()!=0||result.getProductDetailsList().isEmpty()){status(NativeLanguage.text(activity,"แพ็กนี้ยังไม่พร้อมจำหน่ายใน Google Play","This package is not available on Google Play yet."));return;}
 ProductDetails p=result.getProductDetailsList().get(0);ProductDetails.OneTimePurchaseOfferDetails offer=p.getOneTimePurchaseOfferDetails();if(offer==null){status(NativeLanguage.text(activity,"ไม่พบราคาสินค้า","Product price is unavailable."));return;}
 BillingFlowParams.ProductDetailsParams.Builder itemParams=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(p);if(offer.getOfferToken()!=null)itemParams.setOfferToken(offer.getOfferToken());
 activity.runOnUiThread(()->{BillingResult launch=client.launchBillingFlow(activity,BillingFlowParams.newBuilder().setObfuscatedAccountId(owner).setObfuscatedProfileId(profile).setProductDetailsParamsList(Collections.singletonList(itemParams.build())).build());if(launch.getResponseCode()!=0)status(NativeLanguage.text(activity,"เปิดหน้าชำระเงินไม่ได้ กรุณาลองใหม่","Could not open checkout. Please retry."));});
 });}));}
 private void restore(){client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(r,ps)->{if(r.getResponseCode()==0)for(Purchase p:ps)purchase(p);});}
 private void purchase(Purchase p){if(p.getPurchaseState()==Purchase.PurchaseState.PENDING){status(NativeLanguage.text(activity,"รอการชำระเงิน เมื่อสำเร็จระบบจะเติม COCKRO coin ให้","Payment pending. COCKRO coins will be credited after payment completes."));return;}if(p.getPurchaseState()!=Purchase.PurchaseState.PURCHASED)return;for(String id:p.getProducts())if(IDS.contains(id)){JSONObject d=event("purchase");try{d.put("productId",id).put("token",p.getPurchaseToken());}catch(JSONException ignored){}emit(d);}}
 @Override public void onPurchasesUpdated(BillingResult r,List<Purchase> ps){if(r.getResponseCode()==0&&ps!=null)for(Purchase p:ps)purchase(p);else if(r.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED)status(NativeLanguage.text(activity,"ยกเลิกการซื้อแล้ว","Purchase cancelled."));else status(NativeLanguage.text(activity,"ยังยืนยันการซื้อไม่ได้ กดตรวจรายการค้างเพื่อรับ COCKRO coin","Purchase not yet confirmed. Check pending purchases to receive your COCKRO coins."));}
 public void destroy(){web=null;client.endConnection();}
}
