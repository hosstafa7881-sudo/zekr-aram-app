package com.zekraram.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // دور هشتم — must be registered BEFORE super.onCreate(), which
        // is when the bridge builds its plugin registry.
        registerPlugin(FileSaverPlugin.class);
        registerPlugin(ReminderAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
