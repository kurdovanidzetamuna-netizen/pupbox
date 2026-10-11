/**
 * Georgian for the messages the API sends back (it writes them in English).
 * Exact sentences first, then patterns for ones with numbers or names in
 * them, then the automatic form-check messages. Anything unknown is left as
 * it is rather than guessed.
 */
const EXACT: Record<string, string> = {
  'A gift can start up to a year ahead': 'საჩუქარი შეიძლება დაიწყოს მაქსიმუმ ერთი წლის შემდეგ',
  'A referral code can only be added before your first order.': 'მოწვევის კოდის დამატება მხოლოდ პირველ შეკვეთამდეა შესაძლებელი.',
  'Access denied': 'წვდომა შეზღუდულია',
  'Account is blocked': 'ანგარიში დაბლოკილია',
  'Account not found': 'ანგარიში ვერ მოიძებნა',
  'Add your phone number first.': 'ჯერ ტელეფონის ნომერი დაამატე.',
  'Address is required': 'მისამართი აუცილებელია',
  'Cancel your subscription first, then delete the account.': 'ჯერ გააუქმე გამოწერა, შემდეგ წაშალე ანგარიში.',
  'Cannot modify a cancelled subscription': 'გაუქმებული გამოწერის შეცვლა შეუძლებელია',
  'Cannot refer yourself': 'საკუთარი თავის მოწვევა შეუძლებელია',
  'Cart is empty': 'კალათა ცარიელია',
  'Cart item not found': 'კალათაში ეს ნივთი ვერ მოიძებნა',
  'Cart not found': 'კალათა ვერ მოიძებნა',
  'Choose a photo to upload.': 'აირჩიე ასატვირთი ფოტო.',
  'Choose a size': 'აირჩიე ზომა',
  'Choose a valid start date for the gift': 'აირჩიე საჩუქრის დაწყების სწორი თარიღი',
  'Choose the dog’s size': 'აირჩიე ძაღლის ზომა',
  'City is required': 'ქალაქი აუცილებელია',
  'Coupon usage limit reached': 'კუპონის გამოყენების ლიმიტი ამოიწურა',
  'Dog not found': 'ძაღლი ვერ მოიძებნა',
  'Email already registered': 'ეს ელფოსტა უკვე დარეგისტრირებულია. შედი ანგარიშში.',
  'Enter a Georgian mobile number, e.g. 599 12 34 56': 'შეიყვანე ქართული მობილურის ნომერი, მაგ. 599 12 34 56',
  'Enter a valid email, or leave it empty': 'შეიყვანე სწორი ელფოსტა ან დატოვე ცარიელი',
  'Enter a valid phone number': 'შეიყვანე სწორი ტელეფონის ნომერი',
  'Enter the name to engrave': 'შეიყვანე გრავირების სახელი',
  'First name is required': 'სახელი აუცილებელია',
  'Give the dog a name': 'მიუთითე ძაღლის სახელი',
  'Insufficient stock': 'მარაგი არასაკმარისია',
  'Invalid credentials': 'ელფოსტა ან პაროლი არასწორია',
  'Invalid delivery method': 'მიწოდების მეთოდი არასწორია',
  'Invalid or expired coupon code': 'კუპონის კოდი არასწორია ან ვადა გაუვიდა',
  'Invalid referral code': 'მოწვევის კოდი არასწორია',
  'Last name is required': 'გვარი აუცილებელია',
  'Only a running plan can be extended. Choose a new plan instead.': 'გაგრძელება მხოლოდ მოქმედი გეგმისთვისაა შესაძლებელი. აირჩიე ახალი გეგმა.',
  'Only subscriptions can be gifted': 'საჩუქრად მხოლოდ გამოწერის ჩუქებაა შესაძლებელი',
  'Order not found or already paid': 'შეკვეთა ვერ მოიძებნა ან უკვე გადახდილია',
  'Order not found': 'შეკვეთა ვერ მოიძებნა',
  'Payments are not configured': 'გადახდა დროებით მიუწვდომელია',
  'Please confirm your email and phone first.': 'ჯერ დაადასტურე ელფოსტა და ტელეფონი.',
  'Product not found or unavailable': 'პროდუქტი ვერ მოიძებნა ან მიუწვდომელია',
  'Recipient name is required for a gift': 'მიუთითე, ვისთვისაა საჩუქარი',
  'Recipient name is required': 'მიუთითე მიმღების სახელი',
  'Subscription already cancelled': 'გამოწერა უკვე გაუქმებულია',
  'Subscription not found': 'გამოწერა ვერ მოიძებნა',
  'Subscription plan not found': 'გეგმა ვერ მოიძებნა',
  'Tell us the dog’s name': 'მიუთითე ძაღლის სახელი',
  'Tell us the name and size of the dog the gift is for': 'მიუთითე იმ ძაღლის სახელი და ზომა, ვისთვისაც საჩუქარია',
  'Text messages are not set up yet. Please try again later.': 'SMS ჯერ არ მუშაობს. სცადე მოგვიანებით.',
  'That coupon has just been used up. Remove it from your cart and try again.': 'ეს კუპონი ახლახან ამოიწურა. მოხსენი კალათიდან და სცადე თავიდან.',
  'The code is 6 digits': 'კოდი 6-ნიშნაა',
  'The gift can’t start in the past': 'საჩუქარი წარსულში ვერ დაიწყება',
  'The photo is too large (8 MB at most).': 'ფოტო ძალიან დიდია (მაქსიმუმ 8 MB).',
  'This code has expired. Ask for a new one.': 'კოდს ვადა გაუვიდა. მოითხოვე ახალი.',
  'This dog has an active subscription. Edit the details instead, or remove it after the subscription ends.': 'ამ ძაღლს აქტიური გამოწერა აქვს. შეცვალე მონაცემები ან წაშალე გამოწერის დასრულების შემდეგ.',
  'This link has expired or was already used. Ask for a new one.': 'ბმულს ვადა გაუვიდა ან უკვე გამოყენებულია. მოითხოვე ახალი.',
  'This phone number is already used by another account. Sign in instead.': 'ეს ნომერი უკვე სხვა ანგარიშზეა. შედი ანგარიშში.',
  'This phone number is already used by another account.': 'ეს ნომერი უკვე სხვა ანგარიშზეა.',
  'This plan is no longer sold, so it can’t be extended. Choose a new plan instead.': 'ეს გეგმა აღარ იყიდება, ამიტომ ვერ გაგრძელდება. აირჩიე ახალი გეგმა.',
  'This subscription has ended': 'ეს გამოწერა დასრულებულია',
  'Too many codes asked for. Try again in an hour.': 'ძალიან ბევრი კოდი მოითხოვე. სცადე ერთ საათში.',
  'Too many wrong tries. Ask for a new code.': 'ძალიან ბევრი არასწორი ცდა. მოითხოვე ახალი კოდი.',
  'Use a JPG, PNG or WebP photo.': 'გამოიყენე JPG, PNG ან WebP ფოტო.',
  'User not found': 'მომხმარებელი ვერ მოიძებნა',
  'You have already used this coupon': 'ეს კუპონი უკვე გამოიყენე',
  'Your current password is not right.': 'მიმდინარე პაროლი არასწორია.',
  'Your password is not right.': 'პაროლი არასწორია.',
  'Too Many Requests': 'ძალიან ბევრი მცდელობა. ცოტა ხანში სცადე.',
  'ThrottlerException: Too Many Requests': 'ძალიან ბევრი მცდელობა. ცოტა ხანში სცადე.',
  'Unauthorized': 'სესია დასრულდა. შედი თავიდან.',
  'Internal server error': 'რაღაც შეფერხდა. სცადე თავიდან.',
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^That code isn't right\. (\d+) tr(?:y|ies) left\.$/, (m) => `კოდი არასწორია. დარჩა ${m[1]} ცდა.`],
  [/^Please wait (\d+) seconds before asking for a new code\.$/, (m) => `ახალი კოდის მოთხოვნამდე დაელოდე ${m[1]} წამი.`],
  [/^Your coupon .+, so we removed it\. Check the new total and try again\.$/, () => 'შენი კუპონი აღარ მოქმედებს, ამიტომ მოვხსენით. გადაამოწმე ახალი ჯამი და სცადე თავიდან.'],
  [/^(".+"|An item in your cart) just sold out or has fewer left than you chose\. Please update your cart\.$/, (m) => `${m[1] === 'An item in your cart' ? 'კალათის ერთ-ერთი ნივთი' : m[1]} ამოიწურა ან ნაკლებია, ვიდრე აირჩიე. განაახლე კალათა.`],
  [/^The engraving can be up to (\d+) characters$/, (m) => `გრავირება მაქსიმუმ ${m[1]} სიმბოლოა`],
  // Automatic form checks (class-validator), possibly with a field path in front.
  [/must be an email$/, () => 'შეიყვანე სწორი ელფოსტა'],
  [/must be longer than or equal to (\d+) characters$/, (m) => `მინიმუმ ${m[1]} სიმბოლო`],
  [/must be shorter than or equal to (\d+) characters$/, (m) => `მაქსიმუმ ${m[1]} სიმბოლო`],
  [/should not be empty$/, () => 'შეავსე ყველა სავალდებულო ველი'],
  [/must be a string$|must be a number|must be a boolean|must be an array|must be a valid ISO 8601 date string$/, () => 'ერთ-ერთი ველი არასწორადაა შევსებული'],
  [/should not exist$/, () => 'ფორმაში ზედმეტი ველია. განაახლე გვერდი და სცადე თავიდან.'],
  [/must be one of the following values|must be a valid enum value/, () => 'აირჩიე ერთ-ერთი ვარიანტი'],
];

/** One message in Georgian, or unchanged if we don't know it. */
export function toGeorgian(message: string): string {
  const m = String(message ?? '').trim();
  // Messages from nested forms carry a field path ("gift.dog.Choose the dog’s size").
  const bare = m.replace(/^(?:[a-zA-Z]+\.)+(?=[A-Z])/, '');
  if (EXACT[bare]) return EXACT[bare];
  for (const [re, ka] of PATTERNS) {
    const hit = bare.match(re);
    if (hit) return ka(hit);
  }
  return m;
}
