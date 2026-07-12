import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lessonsPath = resolve(__dirname, '../client/src/data/lessons.json');

const LESSON_DATA = [
  {
    id: 'lesson-01',
    title: 'Du lịch nước ngoài',
    description: 'Kể về chuyến du lịch nước ngoài cùng gia đình',
    sentences: [
      ['I love traveling to new countries.', 'Tôi thích đi du lịch đến những quốc gia mới.'],
      ['Every year, I go on a trip with my family.', 'Mỗi năm, tôi đi chơi cùng gia đình.'],
      ['First, we choose a beautiful place.', 'Đầu tiên, chúng tôi chọn một nơi đẹp.'],
      ['Then, we buy our plane tickets online.', 'Sau đó, chúng tôi mua vé máy bay trên mạng.'],
      ['I always pack my suitcase two days before the trip.', 'Tôi luôn đóng vali hai ngày trước chuyến đi.'],
      ['I put in my clothes, shoes, and a camera.', 'Tôi cho quần áo, giày và máy ảnh vào.'],
      ['When I travel abroad, I like to try new food and meet new people.', 'Khi đi nước ngoài, tôi thích thử món mới và gặp người mới.'],
      ['Sometimes, the language is different, but I can use my phone to translate.', 'Đôi khi ngôn ngữ khác, nhưng tôi dùng điện thoại để dịch.'],
      ['Traveling is very exciting.', 'Du lịch rất thú vị.'],
      ['I can see famous places and take a lot of beautiful photos.', 'Tôi có thể xem địa danh nổi tiếng và chụp nhiều ảnh đẹp.'],
      ['I always feel very happy when I explore a new country.', 'Tôi luôn cảm thấy rất vui khi khám phá một đất nước mới.'],
    ],
  },
  {
    id: 'lesson-02',
    title: 'Tại sân bay',
    description: 'Trải nghiệm làm thủ tục và lên máy bay tại sân bay',
    sentences: [
      ['Today, I am at the airport.', 'Hôm nay, tôi đang ở sân bay.'],
      ['I am going to London.', 'Tôi đang đi London.'],
      ['First, I go to the check-in desk.', 'Đầu tiên, tôi đến quầy làm thủ tục.'],
      ['I give the woman my passport and my ticket.', 'Tôi đưa hộ chiếu và vé cho nhân viên.'],
      ['She takes my big suitcase.', 'Cô ấy nhận vali lớn của tôi.'],
      ['Next, I go through security.', 'Tiếp theo, tôi qua cửa an ninh.'],
      ['I take off my jacket and put my bag in a tray.', 'Tôi cởi áo khoác và đặt túi vào khay.'],
      ['After that, I wait in the departure lounge.', 'Sau đó, tôi chờ ở khu ga đi.'],
      ['The airport is very big and busy.', 'Sân bay rất lớn và đông đúc.'],
      ['There are many shops and cafes.', 'Có nhiều cửa hàng và quán cà phê.'],
      ['I buy a coffee and read a book.', 'Tôi mua cà phê và đọc sách.'],
      ['Finally, I look at the big screen.', 'Cuối cùng, tôi nhìn màn hình lớn.'],
      ['It says my flight is ready.', 'Màn hình báo chuyến bay của tôi đã sẵn sàng.'],
      ['I walk to the gate and get on the plane.', 'Tôi đi đến cổng và lên máy bay.'],
    ],
  },
  {
    id: 'lesson-03',
    title: 'Đặt phòng khách sạn',
    description: 'Hội thoại đặt phòng khách sạn qua điện thoại',
    sentences: [
      ['Hello, I would like to book a room, please.', 'Xin chào, tôi muốn đặt phòng ạ.'],
      ['I need a double room for three nights.', 'Tôi cần phòng đôi trong ba đêm.'],
      ['We will arrive on Friday, the 15th of August, and leave on Monday, the 18th.', 'Chúng tôi đến thứ Sáu ngày 15 tháng 8 và rời đi thứ Hai ngày 18.'],
      ['Do you have a room available?', 'Bạn còn phòng trống không?'],
      ['Great.', 'Tuyệt vời.'],
      ['Does the room have a bathroom and a TV?', 'Phòng có phòng tắm và TV không?'],
      ['I also want to know if breakfast is included in the price.', 'Tôi cũng muốn biết bữa sáng có trong giá không.'],
      ['How much is it for one night?', 'Một đêm bao nhiêu tiền?'],
      ['Okay, that is a good price.', 'Ổn, giá đó hợp lý.'],
      ['My name is Anna Smith.', 'Tên tôi là Anna Smith.'],
      ['I can pay by credit card.', 'Tôi có thể trả bằng thẻ tín dụng.'],
      ['Can you send me an email to confirm my booking?', 'Bạn có thể gửi email xác nhận đặt phòng không?'],
      ['Thank you very much for your help.', 'Cảm ơn bạn rất nhiều vì đã giúp đỡ.'],
    ],
  },
  {
    id: 'lesson-04',
    title: 'Hỏi đường',
    description: 'Hỏi đường đến bảo tàng thành phố',
    sentences: [
      ['Excuse me, can you help me, please?', 'Xin lỗi, bạn giúp tôi được không?'],
      ['I am a tourist and I am lost.', 'Tôi là khách du lịch và tôi bị lạc.'],
      ['I am looking for the city museum.', 'Tôi đang tìm bảo tàng thành phố.'],
      ['Is it far from here?', 'Có xa đây không?'],
      ['Okay, so I need to walk straight on this street.', 'Vậy tôi cần đi thẳng trên con phố này.'],
      ['Then, I turn left at the traffic lights.', 'Sau đó, tôi rẽ trái ở đèn giao thông.'],
      ['After that, I walk past the big supermarket and the park.', 'Rồi tôi đi qua siêu thị lớn và công viên.'],
      ['Is the museum on the right or on the left?', 'Bảo tàng ở bên phải hay bên trái?'],
      ['On the right, next to the post office.', 'Bên phải, cạnh bưu điện.'],
      ['Thank you.', 'Cảm ơn bạn.'],
      ['How long does it take to walk there?', 'Đi bộ mất bao lâu?'],
      ['Only ten minutes?', 'Chỉ mười phút thôi à?'],
      ['That is great.', 'Tuyệt quá.'],
      ['Thank you so much for your help.', 'Cảm ơn bạn rất nhiều vì đã giúp.'],
      ['Have a nice day!', 'Chúc bạn một ngày tốt lành!'],
    ],
  },
  {
    id: 'lesson-05',
    title: 'Gọi món ở nước ngoài',
    description: 'Gọi món và thanh toán tại nhà hàng',
    sentences: [
      ['Good evening.', 'Chào buổi tối.'],
      ['We would like a table for two, please.', 'Cho chúng tôi bàn cho hai người.'],
      ['Thank you.', 'Cảm ơn.'],
      ['Can we see the menu?', 'Cho chúng tôi xem thực đơn được không?'],
      ['The food here looks very delicious.', 'Đồ ăn ở đây trông rất ngon.'],
      ['I am very hungry.', 'Tôi rất đói.'],
      ['For my starter, I would like a green salad.', 'Khai vị, tôi muốn salad xanh.'],
      ['For the main course, I want the grilled chicken with rice and vegetables.', 'Món chính, tôi muốn gà nướng với cơm và rau.'],
      ['My friend would like the tomato pasta.', 'Bạn tôi muốn mì pasta sốt cà chua.'],
      ['Can we also have two glasses of orange juice, please?', 'Cho thêm hai ly nước cam nữa nhé?'],
      ['Could we have some extra bread on the table?', 'Cho thêm bánh mì trên bàn được không?'],
      ['Thank you.', 'Cảm ơn.'],
      ['The food was fantastic.', 'Món ăn tuyệt vời.'],
      ['Could we have the bill, please?', 'Cho chúng tôi hóa đơn nhé?'],
      ['Can we pay by card or only with cash?', 'Trả bằng thẻ hay chỉ tiền mặt?'],
      ['Keep the change!', 'Giữ lại tiền thừa nhé!'],
    ],
  },
  {
    id: 'lesson-06',
    title: 'Phương tiện công cộng',
    description: 'Đi xe buýt và tàu điện ngầm trong thành phố',
    sentences: [
      ['I use public transport every day in the city.', 'Tôi dùng phương tiện công cộng mỗi ngày trong thành phố.'],
      ['Usually, I take the bus to go to the city center.', 'Thường thì tôi đi xe buýt vào trung tâm.'],
      ['I wait at the bus stop near my hotel.', 'Tôi chờ ở trạm xe buýt gần khách sạn.'],
      ['When the bus arrives, I get on and buy a ticket from the driver.', 'Khi xe đến, tôi lên và mua vé từ tài xế.'],
      ['A single ticket is two euros.', 'Vé một chiều hai euro.'],
      ['Sometimes, the bus is very crowded, and I have to stand.', 'Đôi khi xe rất đông và tôi phải đứng.'],
      ['If I want to travel faster, I take the subway.', 'Nếu muốn đi nhanh hơn, tôi đi tàu điện ngầm.'],
      ['The subway station is under the ground.', 'Ga tàu điện ngầm ở dưới lòng đất.'],
      ['I buy a travel card from the machine.', 'Tôi mua thẻ đi lại từ máy.'],
      ['Trains are very fast and arrive every five minutes.', 'Tàu rất nhanh và đến mỗi năm phút.'],
      ['It is a very easy way to travel.', 'Đó là cách đi lại rất dễ.'],
    ],
  },
  {
    id: 'lesson-07',
    title: 'Mua quà lưu niệm',
    description: 'Mua quà lưu niệm ở phố cổ',
    sentences: [
      ['Today is my last day on holiday.', 'Hôm nay là ngày cuối kỳ nghỉ của tôi.'],
      ['I want to buy some gifts for my family and friends.', 'Tôi muốn mua quà cho gia đình và bạn bè.'],
      ['I go to a small souvenir shop in the old town.', 'Tôi đến cửa hàng lưu niệm nhỏ ở phố cổ.'],
      ['There are many beautiful things here.', 'Ở đây có nhiều thứ đẹp.'],
      ['I see some nice postcards and magnets.', 'Tôi thấy bưu thiếp và nam châm đẹp.'],
      ['I decide to buy three magnets for my colleagues.', 'Tôi quyết định mua ba nam châm cho đồng nghiệp.'],
      ['Then, I look at the t-shirts.', 'Sau đó, tôi xem áo phông.'],
      ['I want to buy a blue t-shirt for my brother.', 'Tôi muốn mua áo phông xanh cho anh trai.'],
      ['Excuse me, how much is this t-shirt?', 'Xin lỗi, áo này bao nhiêu tiền?'],
      ['Fifteen dollars?', 'Mười lăm đô à?'],
      ['Do you have it in a size large?', 'Bạn có size lớn không?'],
      ['Thank you.', 'Cảm ơn.'],
      ['I will take the magnets and the t-shirt.', 'Tôi lấy nam châm và áo phông.'],
      ['Can I have a bag, please?', 'Cho tôi một túi nhé?'],
    ],
  },
  {
    id: 'lesson-08',
    title: 'Tham quan bảo tàng',
    description: 'Tham quan bảo tàng nghệ thuật quốc gia',
    sentences: [
      ['I am visiting the National Art Museum today.', 'Hôm nay tôi tham quan Bảo tàng Nghệ thuật Quốc gia.'],
      ['I love history and art.', 'Tôi yêu thích lịch sử và nghệ thuật.'],
      ['First, I buy my ticket at the entrance.', 'Đầu tiên, tôi mua vé ở cổng vào.'],
      ['It costs ten euros for an adult.', 'Vé người lớn mười euro.'],
      ['The museum is very quiet and big.', 'Bảo tàng rất yên tĩnh và rộng.'],
      ['I walk slowly and look at the old paintings.', 'Tôi đi chậm và ngắm những bức tranh cổ.'],
      ['Some of them are hundreds of years old.', 'Một số bức hàng trăm năm tuổi.'],
      ['I also see some beautiful statues.', 'Tôi cũng thấy những bức tượng đẹp.'],
      ['There is a rule: you cannot touch the art, and you cannot take photos with a flash.', 'Có quy định: không được chạm vào tác phẩm và không chụp ảnh có đèn flash.'],
      ['I learn a lot of new things today.', 'Hôm nay tôi học được nhiều điều mới.'],
      ['Before I leave, I go to the museum cafe to drink some tea and rest my legs.', 'Trước khi rời đi, tôi vào quán cà phê bảo tàng uống trà và nghỉ chân.'],
    ],
  },
  {
    id: 'lesson-09',
    title: 'Kỳ nghỉ biển',
    description: 'Kỳ nghỉ hè tại bãi biển Tây Ban Nha',
    sentences: [
      ['I am on a summer holiday in Spain.', 'Tôi đang nghỉ hè ở Tây Ban Nha.'],
      ['I am staying at a nice hotel near the beach.', 'Tôi ở khách sạn đẹp gần biển.'],
      ['The weather is beautiful.', 'Thời tiết đẹp.'],
      ['It is very sunny and hot every day.', 'Mỗi ngày rất nắng và nóng.'],
      ['In the morning, I put on my swimsuit and go to the beach.', 'Buổi sáng, tôi mặc đồ bơi và ra biển.'],
      ['The sand is white and the water is very clear and blue.', 'Cát trắng và nước biển trong veo màu xanh.'],
      ['I love swimming in the sea.', 'Tôi thích bơi ở biển.'],
      ['After that, I lie on a towel and read a book under an umbrella.', 'Sau đó, tôi nằm trên khăn và đọc sách dưới ô.'],
      ['Sometimes, I walk along the beach and collect small shells.', 'Đôi khi tôi đi dọc bờ biển và nhặt vỏ sò.'],
      ['In the evening, I watch the sunset and eat fresh seafood.', 'Buổi tối, tôi ngắm hoàng hôn và ăn hải sản tươi.'],
      ['It is very relaxing.', 'Rất thư giãn.'],
    ],
  },
  {
    id: 'lesson-10',
    title: 'Phiêu lưu leo núi',
    description: 'Chuyến leo núi cuối tuần cùng bạn bè',
    sentences: [
      ['This weekend, I am going on a mountain adventure with my friends.', 'Cuối tuần này, tôi đi phiêu lưu leo núi với bạn bè.'],
      ['We wake up very early in the morning.', 'Chúng tôi dậy rất sớm buổi sáng.'],
      ['I wear strong boots and a warm jacket.', 'Tôi mang giày bốt chắc và áo khoác ấm.'],
      ['I carry a backpack with water, sandwiches, and a map.', 'Tôi mang ba lô có nước, bánh mì kẹp và bản đồ.'],
      ['We start walking up the path.', 'Chúng tôi bắt đầu đi lên con đường mòn.'],
      ['The air is very fresh and cold.', 'Không khí rất trong lành và lạnh.'],
      ['We see tall trees and beautiful birds.', 'Chúng tôi thấy cây cao và chim đẹp.'],
      ['Walking up the mountain is hard work, and I feel tired.', 'Leo núi vất vả và tôi cảm thấy mệt.'],
      ['But we do not stop.', 'Nhưng chúng tôi không dừng lại.'],
      ['Finally, we reach the top of the mountain.', 'Cuối cùng, chúng tôi lên đến đỉnh núi.'],
      ['The view is amazing.', 'Cảnh quan tuyệt đẹp.'],
      ['We sit down, eat our lunch, and take a lot of great photos.', 'Chúng tôi ngồi xuống, ăn trưa và chụp nhiều ảnh đẹp.'],
    ],
  },
];

function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return Math.max(2.2, Math.min(8, words * 0.38 + 0.8));
}

function buildSentences(lessonNum, pairs) {
  const num = String(parseInt(lessonNum, 10));
  let time = 0;
  return pairs.map(([english, vietnamese], index) => {
    const duration = estimateDuration(english);
    const sentence = {
      id: `${num}-${index + 1}`,
      english,
      phonetic: '',
      vietnamese,
      time_start: Math.round(time * 100) / 100,
      time_end: Math.round((time + duration) * 100) / 100,
    };
    time += duration + 0.25;
    return sentence;
  });
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));

for (const data of LESSON_DATA) {
  const lessonNum = data.id.replace('lesson-', '');
  const index = lessons.findIndex((item) => item.id === data.id);
  if (index === -1) {
    console.warn(`Không tìm thấy ${data.id}`);
    continue;
  }

  const sentences = buildSentences(lessonNum, data.sentences);
  const duration = Math.ceil(sentences.at(-1).time_end);

  lessons[index] = {
    ...lessons[index],
    title: data.title,
    description: data.description,
    duration,
    sentences,
  };

  console.log(`✓ ${data.id}: ${sentences.length} câu, ~${duration}s`);
}

writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
console.log('\nĐã cập nhật lessons.json');
