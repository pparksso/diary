const updateBtns = document.querySelectorAll("#updateBtn");
const delBtns = document.querySelectorAll("#delBtn");

delBtns.forEach((item, idx) => {
  item.addEventListener("click", (e) => {
    const num = item.dataset.num;
    axios({
      method: "POST",
      url: "/delete",
      data: {
        num: num,
      },
    })
      .then((res) => {
        if (res.data) {
          const parents = item.parentElement;
          const parents2 = parents.parentElement;
          parents2.remove();
        } else {
          alert("삭제할 수 없습니다.");
        }
      })
      .catch((err) => {
        console.log(err);
      });
    e.preventDefault();
  });
});

updateBtns.forEach((item, idx) => {
  item.addEventListener("click", (e) => {
    const num = item.dataset.num;
    axios({
      method: "POST",
      url: "/update",
      data: {
        num: num,
      },
    }).then((res) => {
      axios({
        url: "/update",
        data: {
          res: res.data,
        },
      });
    });
    e.preventDefault();
  });
});
