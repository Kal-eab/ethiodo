$entities = @(
  "Product","Order","CartItem","Favorite","Review","Message","Notification",
  "ContactRequest","ProductLike","ProductShare","ProductEvent","UserBehavior",
  "Creator","CreatorProductLink","CustomerReferral","ReferralLink",
  "UserNotification","CategoryConfig"
)
foreach ($entity in $entities) {
    $file = "..\exports\$entity.csv"
    if (Test-Path $file) {
        Write-Host "Importing $entity..."
        node scripts/import-csv.js $entity $file
    } else {
        Write-Host "Skipping $entity (no file found at $file)"
    }
}
