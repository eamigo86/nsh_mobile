# NSH Todo — commands for the Native Shell (NSH) app in this folder.

SHELL := /bin/bash
.DEFAULT_GOAL := help

NSH_HOME     ?= $(HOME)/.nsh
ANDROID_HOME ?= $(HOME)/Library/Android/sdk
AVD          ?= $(shell "$(ANDROID_HOME)/emulator/emulator" -list-avds 2>/dev/null | head -1)
OUT          ?= dist
NSH_TAG      ?= v0.5.0
LIBS         ?= native/libs
IOS_HOST     ?= native/ios
IOS_DERIVED  ?= $(IOS_HOST)/build
IOS_APP      ?= $(IOS_DERIVED)/Build/Products/Debug-iphonesimulator/NSHTodoHost.app
IOS_ID       ?= com.example.nshtodo.host
CRATE_ID     ?= com.example.nshtodo
CRATE_OUT    ?= $(OUT)/ios-crate-sim
ANDROID_HOST ?= native/android
ANDROID_ID   ?= com.example.nshtodo.host
JAVA_HOME    ?= $(HOME)/Library/Java/JavaVirtualMachines/openjdk-21.0.1/Contents/Home

export PATH := $(NSH_HOME)/bin:$(PATH)
export ANDROID_HOME
export JAVA_HOME

.PHONY: help install components update check test dev ios android web macos emulator \
        package-ios package-android package-web clean \
        embed-libs ios-host ios-host-run android-host android-host-run ios-crate ios-crate-run ios-crate-device

help: ## List every target
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- Toolchain -------------------------------------------------------------

install: ## Install the nsh CLI into NSH_HOME (release tarball, SHA-256 checked, no shell rc edits)
	@command -v nsh >/dev/null && nsh --version || curl -fsSL https://nsh.dev/install.sh | sh

components: ## Install the iOS, Android and web runtimes
	nsh component add ios android web

update: ## Update nsh to its latest release
	nsh update

# --- Develop ---------------------------------------------------------------

check: ## Type check the app (TypeScript 7, no Node needed)
	nsh check

test: ## Run the app's tests headless (*.test.tsx)
	nsh test

dev: ## Run in this Mac's native host with hot reload
	nsh dev

ios: ## Run on the iOS Simulator with hot reload
	nsh run --target ios

android: ## Run on the Android emulator or device with hot reload (make emulator first)
	nsh run --target android

web: ## Run in the browser with hot reload
	nsh run --target web

macos: ## Run as an AppKit window with hot reload
	nsh run --target macos

emulator: ## Boot the Android emulator (AVD=<name> to choose)
	@test -n "$(AVD)" || { echo "No AVD found: create one in Android Studio"; exit 1; }
	"$(ANDROID_HOME)/emulator/emulator" -avd "$(AVD)" >/dev/null 2>&1 &
	"$(ANDROID_HOME)/platform-tools/adb" wait-for-device

# --- Package ---------------------------------------------------------------

package-ios: ## Unsigned iOS .app (add SIGN=... PROFILE=... for a signed .ipa)
	nsh package --target ios --out $(OUT)/ios $(if $(SIGN),--sign "$(SIGN)") $(if $(PROFILE),--profile "$(PROFILE)")

package-android: ## Android .apk (KEYSTORE=... for a release key)
	nsh package --target android --out $(OUT)/android $(if $(KEYSTORE),--keystore "$(KEYSTORE)")

package-web: ## Static website
	nsh package --target web --out $(OUT)/web

clean: ## Remove packaged output
	rm -rf $(OUT)

# --- Native hosts (NSH embedded in an iOS and an Android app, with a location bridge) ---------

# Zips are kept in $(LIBS)/download; each platform extracts into a fresh directory (delete $(LIBS)/<platform> to redo).
embed-libs: ## Fetch the NSH embed libraries (release $(NSH_TAG), SHA-256 checked) into native/libs
	@set -e; mkdir -p $(LIBS)/download; \
	for p in ios android; do \
	  f=nsh-embed-$$p.zip; \
	  gh release download $(NSH_TAG) -R longbridge/nsh -p "$$f" -p "$$f.sha256" -D $(LIBS)/download --clobber; \
	  (cd $(LIBS)/download && shasum -a 256 -c "$$f.sha256"); \
	  mkdir "$(LIBS)/$$p" && unzip -q "$(LIBS)/download/$$f" -d "$(LIBS)/$$p"; \
	done; \
	find $(LIBS) -maxdepth 4 \( -name '*.xcframework' -o -name '*.aar' \)

ios-host: ## Build the iOS host app for the simulator (needs embed-libs)
	nsh build App.tsx --release --out $(IOS_HOST)/nsh
	xcodebuild -project $(IOS_HOST)/NSHTodoHost.xcodeproj -scheme NSHTodoHost -sdk iphonesimulator \
	  -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath $(IOS_DERIVED) build -quiet

ios-host-run: ## Install and launch the iOS host on the booted simulator (DEV=1: connect to nsh dev)
	xcrun simctl install booted $(IOS_APP)
	xcrun simctl launch booted $(IOS_ID) $(if $(DEV),--dev-server ws://127.0.0.1:8790/ws)

android-host: ## Build the Android host APK (needs embed-libs)
	nsh build App.tsx --release --out $(ANDROID_HOST)/app/src/main/assets/nsh
	cd $(ANDROID_HOST) && ./gradlew assembleDebug

android-host-run: ## Install and launch the Android host on the running emulator or device (DEV=1: connect to nsh dev)
	"$(ANDROID_HOME)/platform-tools/adb" install -r $(ANDROID_HOST)/app/build/outputs/apk/debug/app-debug.apk
	$(if $(DEV),"$(ANDROID_HOME)/platform-tools/adb" reverse tcp:8790 tcp:8790)
	"$(ANDROID_HOME)/platform-tools/adb" shell am start -n $(ANDROID_ID)/.MainActivity $(if $(DEV),--es dev_server ws://127.0.0.1:8790/ws)

# --- iOS through the app's own Rust crate (rust/, CoreLocation through objc2; no Xcode project) ---------

ios-crate: ## Package the iOS Simulator .app with the Rust crate (CoreLocation, no Xcode project)
	nsh package --target ios-simulator --out $(CRATE_OUT)

# The C dependencies are built with the current SDK, which needs iOS 13+ for ___chkstk_darwin; rustc's device default is 10.0.
ios-crate-device: export IPHONEOS_DEPLOYMENT_TARGET ?= 15.0
ios-crate-device: ## Package the unsigned iOS device .app with the Rust crate (SIGN=... PROFILE=... for an .ipa)
	nsh package --target ios --out $(OUT)/ios-crate $(if $(SIGN),--sign "$(SIGN)") $(if $(PROFILE),--profile "$(PROFILE)")

ios-crate-run: ## Install and launch the packaged crate app on the booted simulator (make ios-crate first)
	xcrun simctl install booted "$(CRATE_OUT)/NSH Todo.app"
	xcrun simctl launch booted $(CRATE_ID)
