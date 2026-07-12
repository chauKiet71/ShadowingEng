import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lessonsPath = resolve(__dirname, '../client/src/data/lessons.json');

const LESSON_DATA = [
  {
    id: 'lesson-11',
    title: 'Thói quen buổi sáng',
    description: 'Mô tả thói quen buổi sáng trước khi đi làm',
    sentences: [
      ['I usually wake up at seven o\'clock every morning.', 'Tôi thường thức dậy lúc bảy giờ mỗi sáng.'],
      ['The first thing I do is get out of bed and open the window.', 'Việc đầu tiên tôi làm là ra khỏi giường và mở cửa sổ.'],
      ['I like to feel the fresh air.', 'Tôi thích cảm nhận không khí trong lành.'],
      ['Then, I go to the bathroom, wash my face, and brush my teeth.', 'Sau đó, tôi vào phòng tắm, rửa mặt và đánh răng.'],
      ['After that, I make breakfast in the kitchen.', 'Tiếp theo, tôi làm bữa sáng trong bếp.'],
      ['I usually eat toast with jam and drink a cup of hot coffee.', 'Tôi thường ăn bánh mì nướng với mứt và uống một tách cà phê nóng.'],
      ['While I eat, I look at my phone to read the news.', 'Trong lúc ăn, tôi xem điện thoại để đọc tin tức.'],
      ['At eight o\'clock, I put on my clothes and take my bag.', 'Lúc tám giờ, tôi mặc quần áo và lấy túi.'],
      ['Finally, I leave my house and walk to the bus stop to go to work.', 'Cuối cùng, tôi rời nhà và đi bộ đến trạm xe buýt để đi làm.'],
    ],
  },
  {
    id: 'lesson-12',
    title: 'Tại quán cà phê',
    description: 'Buổi sáng thư giãn tại quán cà phê yêu thích',
    sentences: [
      ['I love going to my favorite cafe on Saturday mornings.', 'Tôi thích đến quán cà phê yêu thích vào sáng thứ Bảy.'],
      ['It is a small and quiet place near my house.', 'Đó là một nơi nhỏ và yên tĩnh gần nhà tôi.'],
      ['When I walk in, I say hello to the barista.', 'Khi bước vào, tôi chào nhân viên pha chế.'],
      ['I look at the menu on the wall.', 'Tôi nhìn thực đơn trên tường.'],
      ['"Can I have a large cappuccino and a chocolate muffin, please?"', '"Cho tôi một ly cappuccino lớn và một bánh muffin sô cô la được không?"'],
      ['I pay with my card and wait for my order.', 'Tôi trả bằng thẻ và chờ đơn hàng.'],
      ['Then, I find a comfortable chair near the window.', 'Sau đó, tôi tìm một ghế thoải mái gần cửa sổ.'],
      ['I sit down and open my laptop to do some work.', 'Tôi ngồi xuống và mở laptop để làm việc.'],
      ['Sometimes, I just read a book and listen to soft music.', 'Đôi khi, tôi chỉ đọc sách và nghe nhạc nhẹ.'],
      ['The coffee is always hot and very delicious.', 'Cà phê luôn nóng và rất ngon.'],
      ['It is very relaxing.', 'Thật rất thư giãn.'],
    ],
  },
  {
    id: 'lesson-13',
    title: 'Đi siêu thị',
    description: 'Mua sắm tại siêu thị theo danh sách',
    sentences: [
      ['Today, my fridge is empty, so I need to go to the supermarket.', 'Hôm nay tủ lạnh trống, nên tôi cần đi siêu thị.'],
      ['Before I leave, I write a shopping list so I don\'t forget anything.', 'Trước khi đi, tôi viết danh sách mua sắm để không quên gì.'],
      ['At the store, I take a shopping cart and walk down the aisles.', 'Ở cửa hàng, tôi lấy xe đẩy và đi dọc các lối đi.'],
      ['First, I go to the fruit section and buy some apples and bananas.', 'Đầu tiên, tôi đến khu trái cây và mua táo với chuối.'],
      ['Next, I get some milk, eggs, and cheese.', 'Tiếp theo, tôi lấy sữa, trứng và phô mai.'],
      ['I also need some chicken and rice for dinner tonight.', 'Tôi cũng cần gà và gạo cho bữa tối nay.'],
      ['The supermarket is very busy today.', 'Siêu thị hôm nay rất đông.'],
      ['When my cart is full, I go to the checkout.', 'Khi xe đẩy đầy, tôi đến quầy thanh toán.'],
      ['I put my items on the belt, pay the cashier, and carry my bags home.', 'Tôi đặt hàng lên băng chuyền, trả tiền cho thu ngân và mang túi về nhà.'],
    ],
  },
  {
    id: 'lesson-14',
    title: 'Việc nhà',
    description: 'Dọn dẹp nhà cửa vào ngày Chủ nhật',
    sentences: [
      ['Sunday is my day to clean the house.', 'Chủ nhật là ngày tôi dọn nhà.'],
      ['I have a lot of housework to do today.', 'Hôm nay tôi có nhiều việc nhà phải làm.'],
      ['First, I collect all my dirty clothes and put them in the washing machine.', 'Đầu tiên, tôi gom quần áo bẩn và cho vào máy giặt.'],
      ['Then, I go to the living room to dust the furniture and tidy up my books.', 'Sau đó, tôi vào phòng khách để lau bụi đồ đạc và sắp xếp sách.'],
      ['After that, I take a broom and sweep the floor in every room.', 'Tiếp theo, tôi lấy chổi và quét sàn mọi phòng.'],
      ['I also wash the dirty dishes in the kitchen sink.', 'Tôi cũng rửa chén bẩn ở bồn rửa bếp.'],
      ['Cleaning is not my favorite activity, but I like it when my house is clean and smells fresh.', 'Dọn dẹp không phải việc tôi thích nhất, nhưng tôi thích khi nhà sạch và thơm.'],
      ['Finally, I take out the rubbish.', 'Cuối cùng, tôi đem rác ra ngoài.'],
      ['Now, I can sit on the sofa and rest.', 'Bây giờ, tôi có thể ngồi sofa và nghỉ ngơi.'],
    ],
  },
  {
    id: 'lesson-15',
    title: 'Kế hoạch cuối tuần',
    description: 'Kế hoạch vui vẻ cho cuối tuần',
    sentences: [
      ['I am very excited about this weekend.', 'Tôi rất hào hứng về cuối tuần này.'],
      ['On Saturday morning, I plan to sleep late and have a big breakfast.', 'Sáng thứ Bảy, tôi định ngủ muộn và ăn sáng no.'],
      ['In the afternoon, I am going to meet my best friend in the park.', 'Buổi chiều, tôi sẽ gặp bạn thân ở công viên.'],
      ['We want to ride our bicycles and have a small picnic under the trees.', 'Chúng tôi muốn đạp xe và picnic nhỏ dưới bóng cây.'],
      ['On Saturday evening, I will stay at home and watch a funny movie.', 'Tối thứ Bảy, tôi ở nhà xem phim vui.'],
      ['On Sunday, I need to help my parents in their garden.', 'Chủ nhật, tôi cần giúp bố mẹ trong vườn.'],
      ['We are going to plant some new flowers.', 'Chúng tôi sẽ trồng vài loài hoa mới.'],
      ['After that, we will have a nice family lunch.', 'Sau đó, chúng tôi sẽ ăn trưa vui vẻ cùng gia đình.'],
      ['I hope the weather is sunny and warm for my weekend plans.', 'Tôi mong thời tiết nắng ấm cho kế hoạch cuối tuần.'],
    ],
  },
  {
    id: 'lesson-16',
    title: 'Gọi điện thoại',
    description: 'Đặt lịch khám răng qua điện thoại',
    sentences: [
      ['Hello, is this the dentist\'s clinic?', 'Xin chào, đây có phải phòng khám nha khoa không?'],
      ['Hi, my name is John Smith.', 'Chào, tôi tên là John Smith.'],
      ['I would like to make an appointment to see the dentist, please.', 'Tôi muốn đặt lịch khám với nha sĩ ạ.'],
      ['Yes, my tooth hurts a little bit.', 'Vâng, răng tôi hơi đau.'],
      ['Do you have any free time this Thursday?', 'Thứ Năm này còn lịch trống không?'],
      ['Oh, Thursday is full.', 'Ồ, thứ Năm đã kín lịch.'],
      ['How about Friday morning?', 'Còn sáng thứ Sáu thì sao?'],
      ['Ten o\'clock is perfect for me.', 'Mười giờ rất hợp với tôi.'],
      ['Thank you.', 'Cảm ơn.'],
      ['Do I need to bring anything with me?', 'Tôi có cần mang theo gì không?'],
      ['Just my ID card?', 'Chỉ cần thẻ căn cước thôi à?'],
      ['Okay, I understand.', 'Được, tôi hiểu rồi.'],
      ['Can you spell the name of the street again, please?', 'Bạn đánh vần lại tên đường giúp tôi được không?'],
      ['Great, I have it.', 'Tuyệt, tôi đã ghi rồi.'],
      ['Thank you very much for your help.', 'Cảm ơn bạn rất nhiều vì đã giúp.'],
      ['I will see you on Friday at ten.', 'Hẹn gặp bạn vào thứ Sáu lúc mười giờ.'],
      ['Goodbye!', 'Tạm biệt!'],
    ],
  },
  {
    id: 'lesson-17',
    title: 'Gặp gỡ hàng xóm',
    description: 'Trò chuyện thân mật với hàng xóm',
    sentences: [
      ['Good morning, Mrs. Brown!', 'Chào buổi sáng, bà Brown!'],
      ['How are you today?', 'Hôm nay bà khỏe không?'],
      ['It is nice to see you.', 'Rất vui được gặp bà.'],
      ['I am doing very well, thank you.', 'Tôi khỏe lắm, cảm ơn bà.'],
      ['The weather is beautiful today, isn\'t it?', 'Hôm nay thời tiết đẹp quá, phải không?'],
      ['Much better than the rain yesterday.', 'Đẹp hơn nhiều so với mưa hôm qua.'],
      ['Are you going to the market now?', 'Bà đang đi chợ à?'],
      ['Oh, going for a walk with your dog.', 'Ồ, bà đang dắt chó đi dạo.'],
      ['He is very cute.', 'Nó dễ thương quá.'],
      ['What is his name?', 'Tên nó là gì?'],
      ['Max?', 'Max à?'],
      ['That is a nice name.', 'Tên hay đấy.'],
      ['By the way, the lights in the hallway are broken again.', 'Nhân tiện, đèn hành lang lại hỏng rồi.'],
      ['I will call the building manager later today to fix them.', 'Tôi sẽ gọi quản lý tòa nhà sau hôm nay để sửa.'],
      ['Anyway, I have to go to work now.', 'Thôi, tôi phải đi làm đây.'],
      ['Have a wonderful day, Mrs. Brown.', 'Chúc bà một ngày tuyệt vời, bà Brown.'],
      ['See you later!', 'Hẹn gặp lại!'],
    ],
  },
  {
    id: 'lesson-18',
    title: 'Thư giãn buổi tối',
    description: 'Thư giãn sau một ngày làm việc dài',
    sentences: [
      ['After a long day at work, I love to relax in the evening.', 'Sau một ngày làm việc dài, tôi thích thư giãn buổi tối.'],
      ['I arrive home at six o\'clock.', 'Tôi về nhà lúc sáu giờ.'],
      ['First, I take off my shoes and change into comfortable clothes.', 'Đầu tiên, tôi cởi giày và thay quần áo thoải mái.'],
      ['I don\'t want to cook, so I order a pizza for dinner.', 'Tôi không muốn nấu, nên gọi pizza cho bữa tối.'],
      ['After I eat, I sit on the sofa in the living room.', 'Sau khi ăn, tôi ngồi sofa trong phòng khách.'],
      ['I turn on the television and watch two episodes of my favorite show.', 'Tôi bật TV và xem hai tập chương trình yêu thích.'],
      ['Sometimes, if I am very tired, I take a long, warm bath.', 'Đôi khi, nếu mệt quá, tôi tắm nước ấm lâu.'],
      ['Before I go to sleep, I read a few pages of a good book.', 'Trước khi ngủ, tôi đọc vài trang sách hay.'],
      ['It helps me to feel calm and sleepy.', 'Điều đó giúp tôi cảm thấy bình yên và buồn ngủ.'],
    ],
  },
  {
    id: 'lesson-19',
    title: 'Bữa tối gia đình',
    description: 'Ăn tối và trò chuyện cùng gia đình',
    sentences: [
      ['Every evening, my family eats dinner together.', 'Mỗi tối, gia đình tôi ăn tối cùng nhau.'],
      ['At seven o\'clock, I help my mother set the table.', 'Lúc bảy giờ, tôi giúp mẹ bày bàn.'],
      ['I put the plates, forks, and glasses on the table.', 'Tôi đặt đĩa, nĩa và ly lên bàn.'],
      ['My father cooks the food.', 'Bố tôi nấu ăn.'],
      ['Tonight, he is making fish, potatoes, and a big green salad.', 'Tối nay, bố làm cá, khoai tây và salad xanh lớn.'],
      ['We all sit down and start to eat.', 'Cả nhà ngồi xuống và bắt đầu ăn.'],
      ['The food is very delicious.', 'Món ăn rất ngon.'],
      ['During dinner, we do not watch TV.', 'Trong lúc ăn tối, chúng tôi không xem TV.'],
      ['Instead, we talk about our day.', 'Thay vào đó, chúng tôi kể về ngày của mình.'],
      ['I tell my parents about my classes at school, and they talk about their work.', 'Tôi kể với bố mẹ về lớp học, còn họ kể về công việc.'],
      ['After we finish eating, my brother and I wash the dishes.', 'Sau khi ăn xong, anh trai tôi và tôi rửa chén.'],
      ['It is a nice family time.', 'Đó là khoảng thời gian gia đình thật đẹp.'],
    ],
  },
  {
    id: 'lesson-20',
    title: 'Việc vặt hàng ngày',
    description: 'Chạy việc vặt trong thành phố vào ngày nghỉ',
    sentences: [
      ['Today, I have a day off, but I am very busy.', 'Hôm nay tôi nghỉ, nhưng vẫn rất bận.'],
      ['I have many errands to run in the city.', 'Tôi có nhiều việc vặt phải làm trong thành phố.'],
      ['First, I need to go to the post office.', 'Đầu tiên, tôi cần đến bưu điện.'],
      ['I have a big package to send to my sister in Canada.', 'Tôi có một gói hàng lớn gửi cho chị gái ở Canada.'],
      ['Next, I walk to the bank to get some cash from the ATM.', 'Tiếp theo, tôi đi bộ đến ngân hàng rút tiền ở cây ATM.'],
      ['After that, I stop at the pharmacy to buy some medicine and a new toothbrush.', 'Sau đó, tôi ghé hiệu thuốc mua thuốc và bàn chải đánh răng mới.'],
      ['Finally, I have to go to the dry cleaner to pick up my winter coat.', 'Cuối cùng, tôi đến tiệm giặt khô lấy áo khoác mùa đông.'],
      ['Running errands takes a lot of time.', 'Chạy việc vặt mất rất nhiều thời gian.'],
      ['When I finish everything, I am going to buy an ice cream!', 'Khi xong hết, tôi sẽ mua một que kem!'],
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
    topic: 'Cuộc sống hằng ngày',
    categoryId: '2',
    duration,
    sentences,
  };

  console.log(`✓ ${data.id}: ${data.title} — ${sentences.length} câu, ~${duration}s`);
}

writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
console.log('\nĐã cập nhật lessons.json (lesson-11 → lesson-20)');
