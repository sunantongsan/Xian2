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
 private void ready(Runnable task){if(client.isReady()){task.run();return;}client.startConnection(new BillingClientStateListener(){public void onBillingSetupFinished(BillingResult r){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)task.run();else status("เชื่อมต่อ Google Play ไม่สำเร็จ กรุณาลองใหม่");}public void onBillingServiceDisconnected(){status("Google Play ขาดการเชื่อมต่อ กรุณาลองใหม่");}});}
 @JavascriptInterface public void refresh(){activity.runOnUiThread(()->ready(()->{catalog();restore();}));}
 private void catalog(){List<QueryProductDetailsParams.Product> list=new ArrayList<>();for(String id:IDS)list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(r,result)->{JSONObject d=event("products");JSONArray products=new JSONArray();if(r.getResponseCode()==0)for(ProductDetails p:result.getProductDetailsList()){ProductDetails.OneTimePurchaseOfferDetails offer=p.getOneTimePurchaseOfferDetails();if(offer==null)continue;try{products.put(new JSONObject().put("id",p.getProductId()).put("price",offer.getFormattedPrice()));}catch(JSONException ignored){}}try{d.put("products",products);}catch(JSONException ignored){}emit(d);});}
 @JavascriptInterface public void buy(String id,String owner,String profile){if(!IDS.contains(id)||!owner.matches("[a-f0-9]{64}")||!profile.matches("[a-f0-9]{64}"))return;activity.runOnUiThread(()->ready(()->{
 QueryProductDetailsParams.Product item=QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build();
 client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(),(r,result)->{
 if(r.getResponseCode()!=0||result.getProductDetailsList().isEmpty()){status("แพ็กนี้ยังไม่พร้อมจำหน่ายใน Google Play");return;}
 ProductDetails p=result.getProductDetailsList().get(0);ProductDetails.OneTimePurchaseOfferDetails offer=p.getOneTimePurchaseOfferDetails();if(offer==null){status("ไม่พบราคาสินค้า");return;}
 BillingFlowParams.ProductDetailsParams.Builder itemParams=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(p);if(offer.getOfferToken()!=null)itemParams.setOfferToken(offer.getOfferToken());
 activity.runOnUiThread(()->{BillingResult launch=client.launchBillingFlow(activity,BillingFlowParams.newBuilder().setObfuscatedAccountId(owner).setObfuscatedProfileId(profile).setProductDetailsParamsList(Collections.singletonList(itemParams.build())).build());if(launch.getResponseCode()!=0)status("เปิดหน้าชำระเงินไม่ได้ กรุณาลองใหม่");});
 });}));}
 private void restore(){client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(r,ps)->{if(r.getResponseCode()==0)for(Purchase p:ps)purchase(p);});}
 private void purchase(Purchase p){if(p.getPurchaseState()==Purchase.PurchaseState.PENDING){status("รอการชำระเงิน เมื่อสำเร็จระบบจะเติม COCKRO coin ให้");return;}if(p.getPurchaseState()!=Purchase.PurchaseState.PURCHASED)return;for(String id:p.getProducts())if(IDS.contains(id)){JSONObject d=event("purchase");try{d.put("productId",id).put("token",p.getPurchaseToken());}catch(JSONException ignored){}emit(d);}}
 @Override public void onPurchasesUpdated(BillingResult r,List<Purchase> ps){if(r.getResponseCode()==0&&ps!=null)for(Purchase p:ps)purchase(p);else if(r.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED)status("ยกเลิกการซื้อแล้ว");else status("ยังยืนยันการซื้อไม่ได้ กดตรวจรายการค้างเพื่อรับ COCKRO coin");}
 public void destroy(){web=null;client.endConnection();}
}

