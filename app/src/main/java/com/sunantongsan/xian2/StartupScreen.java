package com.sunantongsan.xian2;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.BitmapFactory;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.io.InputStream;

/** Lightweight native welcome screen, visible before any patch network request. */
final class StartupScreen extends FrameLayout {
 final TextView status;
 final ProgressBar progress;
 final Button skip,resume;
 StartupScreen(Context context) {
  super(context);setBackgroundColor(0xff08263e);
  ImageView art=new ImageView(context);art.setScaleType(ImageView.ScaleType.CENTER_CROP);
  try(InputStream in=context.getAssets().open("ui/welcome.webp")){art.setImageBitmap(BitmapFactory.decodeStream(in));}catch(Exception ignored){/* solid background remains usable */}
  addView(art,new LayoutParams(-1,-1));
  View shade=new View(context);shade.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,new int[]{0x00061526,0x25061526,0xf5061526}));addView(shade,new LayoutParams(-1,-1));
  LinearLayout panel=new LinearLayout(context);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);panel.setPadding(dp(28),dp(8),dp(28),dp(12));
  TextView title=text(context,"COCKRO",32,0xffffdf91);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setLetterSpacing(.12f);panel.addView(title);
  panel.addView(text(context,NativeLanguage.text(context,"กำเนิดฮีโร่แมลง","Rise of the Insect Heroes"),13,0xffd7f7ff));
  status=text(context,NativeLanguage.text(context,"กำลังตรวจสอบแพตช์…","Checking game updates…"),13,0xffffffff);status.setPadding(0,dp(6),0,dp(5));panel.addView(status);
  progress=new ProgressBar(context,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setIndeterminate(true);progress.setProgressTintList(ColorStateList.valueOf(0xff53e7ff));progress.setIndeterminateTintList(ColorStateList.valueOf(0xff53e7ff));panel.addView(progress,new LinearLayout.LayoutParams(-1,dp(8)));
  resume=new Button(context);resume.setText(NativeLanguage.text(context,"พักดาวน์โหลด","Pause download"));resume.setTextSize(12);panel.addView(resume,new LinearLayout.LayoutParams(-2,dp(44)));
  skip=new Button(context);skip.setText(NativeLanguage.text(context,"เล่นรุ่นที่ติดตั้งอยู่","Play installed version"));skip.setTextSize(11);skip.setTextColor(0xffd7f7ff);skip.setBackgroundTintList(ColorStateList.valueOf(0xff14384d));LinearLayout.LayoutParams button=new LinearLayout.LayoutParams(-2,dp(40));button.topMargin=dp(6);panel.addView(skip,button);
  LayoutParams layout=new LayoutParams(-1,-2,Gravity.BOTTOM);layout.leftMargin=dp(40);layout.rightMargin=dp(40);addView(panel,layout);
 }
 private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
 private TextView text(Context context,String value,int size,int color){TextView t=new TextView(context);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setGravity(Gravity.CENTER);t.setShadowLayer(4,0,2,0xff001020);return t;}
}
