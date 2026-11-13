# NSH Todo — commands for the Native Shell (NSH) app in this folder.

SHELL := /bin/bash
.DEFAULT_GOAL := help

NSH_HOME     ?= $(HOME)/.nsh
ANDROID_HOME ?= $(HOME)/Library/Android/sdk
AVD          ?= $(shell "$(ANDROID_HOME)/emulator/emulator" -list-avds 2>/dev/null | head -1)
OUT          ?= dist

export PATH := $(NSH_HOME)/bin:$(PATH)
export ANDROID_HOME

.PHONY: help install components update check test dev ios android web macos emulator \
        package-ios package-android package-web clean

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
