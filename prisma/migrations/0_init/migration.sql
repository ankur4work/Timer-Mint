-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED',
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "evergreenDuration" INTEGER,
    "evergreenResetDelay" INTEGER,
    "dailyStartTime" TEXT,
    "dailyEndTime" TEXT,
    "recurringDays" TEXT,
    "shippingCutoffTime" TEXT,
    "shippingExcludedDays" TEXT,
    "shippingHolidays" TEXT,
    "shippingNextDayText" TEXT,
    "cartThreshold" DOUBLE PRECISION,
    "cartTimerDuration" INTEGER,
    "expiredText" TEXT,
    "position" TEXT NOT NULL DEFAULT 'TOP',
    "backgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "accentColor" TEXT NOT NULL DEFAULT '#FF0000',
    "preText" TEXT,
    "postText" TEXT,
    "linkUrl" TEXT,
    "linkText" TEXT,
    "showOnAllPages" BOOLEAN NOT NULL DEFAULT true,
    "targetPages" TEXT,
    "excludePages" TEXT,
    "showDays" BOOLEAN NOT NULL DEFAULT true,
    "showHours" BOOLEAN NOT NULL DEFAULT true,
    "showMinutes" BOOLEAN NOT NULL DEFAULT true,
    "showSeconds" BOOLEAN NOT NULL DEFAULT true,
    "showLabels" BOOLEAN NOT NULL DEFAULT true,
    "closeButton" BOOLEAN NOT NULL DEFAULT true,
    "stickyOnScroll" BOOLEAN NOT NULL DEFAULT true,
    "animation" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settingsId" TEXT,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "defaultPosition" TEXT NOT NULL DEFAULT 'TOP',
    "defaultBgColor" TEXT NOT NULL DEFAULT '#000000',
    "defaultTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "defaultAccentColor" TEXT NOT NULL DEFAULT '#FF0000',
    "fontFamily" TEXT NOT NULL DEFAULT 'inherit',
    "fontSize" TEXT NOT NULL DEFAULT '14px',
    "defaultPreText" TEXT,
    "defaultPostText" TEXT,
    "cookieDuration" INTEGER NOT NULL DEFAULT 24,
    "respectDoNotTrack" BOOLEAN NOT NULL DEFAULT false,
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "enableABTesting" BOOLEAN NOT NULL DEFAULT false,
    "customCSS" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timer_shop_idx" ON "Timer"("shop");

-- CreateIndex
CREATE INDEX "Timer_status_idx" ON "Timer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");

-- CreateIndex
CREATE INDEX "Settings_shop_idx" ON "Settings"("shop");

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "Settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

