for i in $(seq 1 110); do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
  echo "Req #$i → HTTP $status"
done
