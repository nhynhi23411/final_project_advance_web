# Test Cloudinary upload - chay trong thu muc server
# 1. Sua $token = "accessToken_tu_login"
# 2. Sua $imagePath = "duong_dan_anh.jpg"
# 3. Chay: .\test-upload.ps1

$baseUrl = "http://localhost:3000/api"
$token = "SUA_ACCESS_TOKEN_VAO_DAY"   # Lay tu POST /api/auth/login
$imagePath = ".\test-image.jpg"        # Dat 1 file anh trong thu muc server hoac sua duong dan

# Login (neu chua co token)
$loginBody = @{ email = "test@example.com"; password = "123456" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.accessToken
Write-Host "Token:" $token.Substring(0, 20) "..."

# Upload anh len Cloudinary
$boundary = [System.Guid]::NewGuid().ToString()
$fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $imagePath))
$enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$fileEnc = $enc.GetString($fileBytes)
$fileName = [System.IO.Path]::GetFileName($imagePath)
$body = @"
--$boundary
Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"
Content-Type: image/jpeg

$fileEnc
--$boundary--
"@
try {
    $upload = Invoke-RestMethod -Uri "$baseUrl/items/upload-image" -Method Post `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body
    Write-Host "Upload OK - url:" $upload.url
    Write-Host "publicId:" $upload.publicId

    # Tao bai dang
    $itemBody = @{
        type = "LOST"
        title = "Test from script"
        description = "Mo ta test"
        category = "Wallet"
        location_text = "Khu A"
        images = @($upload.url)
        image_public_ids = @($upload.publicId)
    } | ConvertTo-Json
    $item = Invoke-RestMethod -Uri "$baseUrl/items" -Method Post `
        -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
        -Body $itemBody
    Write-Host "Tao bai OK - id:" $item._id
} catch {
    Write-Host "Loi:" $_.Exception.Message
}
