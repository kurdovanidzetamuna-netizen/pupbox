-- Views and button taps per promo pop-up.
CREATE TABLE "PromoPopupStat" (
    "popupId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoPopupStat_pkey" PRIMARY KEY ("popupId")
);
